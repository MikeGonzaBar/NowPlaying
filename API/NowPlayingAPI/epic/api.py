"""Read-only Epic Games Store adapter: library, catalog metadata, achievements.

Endpoint shapes mirror the public launcher flow documented by legendary
(``legendary/api/egs.py`` and ``legendary/models/gql.py``). Every response is
parsed defensively because Epic does not version these payloads.
"""

from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Any, Callable, Iterable

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import transaction

import http_client

from .auth import (
    USER_AGENT,
    EpicAuthError,
    ensure_fresh_tokens,
    parse_epic_datetime,
    refresh_access_token,
    serialize_epic_auth_payload,
)
from .models import EpicAchievement, EpicGame

logger = logging.getLogger("epic")


def _mask_id(value: str | None) -> str:
    """Shorten an account id for logs without printing the whole identifier."""
    if not value:
        return "unknown"
    return f"{value[:6]}…"

ENTITLEMENTS_URL = (
    "https://entitlement-public-service-prod08.ol.epicgames.com"
    "/entitlement/api/account/{account_id}/entitlements"
)
LIBRARY_URL = "https://library-service.live.use1a.on.epicgames.com/library/api/public/items"
PLAYTIME_URL = (
    "https://library-service.live.use1a.on.epicgames.com"
    "/library/api/public/playtime/account/{account_id}/all"
)
CATALOG_URL = (
    "https://catalog-public-service-prod06.ol.epicgames.com"
    "/catalog/api/shared/namespace/{namespace}/bulk/items"
)
GRAPHQL_URL = "https://launcher.store.epicgames.com/graphql"

ENTITLEMENT_PAGE_SIZE = 1000
MAX_LIBRARY_PAGES = 50
# A large library means one catalog plus two GraphQL calls per product; the
# pool keeps a 500-game sync in the low minutes instead of tens of minutes.
# Six is the ceiling Epic's Store GraphQL tolerates before it starts answering
# 429 for a library of that size.
SYNC_WORKERS = 6
CATALOG_CACHE_TTL = getattr(settings, "CACHE_TIMEOUTS", {}).get(
    "EPIC_CATALOG", 7 * 24 * 3600
)
ACHIEVEMENT_DEFINITION_TTL = getattr(settings, "CACHE_TIMEOUTS", {}).get(
    "EPIC_ACHIEVEMENTS", 7 * 24 * 3600
)
# Products without achievements are cached briefly: long enough to skip the
# re-check on the next interval, short enough to pick up a newly added set.
ACHIEVEMENT_EMPTY_TTL = 24 * 3600
CATALOG_IMAGE_PREFERENCE = (
    "OfferImageTall",
    "DieselStoreFrontTall",
    "Thumbnail",
    "DieselStoreFrontWide",
    "OfferImageWide",
)

ACHIEVEMENT_DEFINITIONS_QUERY = """
query Achievement($sandboxId: String!, $locale: String!) {
  Achievement {
    productAchievementsRecordBySandbox(sandboxId: $sandboxId, locale: $locale) {
      sandboxId
      totalAchievements
      totalProductXP
      achievementSets { achievementSetId isBase totalAchievements totalXP }
      achievements {
        achievement {
          name
          hidden
          isBase
          unlockedDisplayName
          lockedDisplayName
          unlockedDescription
          lockedDescription
          unlockedIconId
          lockedIconId
          XP
          flavorText
          unlockedIconLink
          lockedIconLink
          tier { name hexColor min max }
          rarity { percent }
        }
      }
    }
  }
}
"""

PLAYER_ACHIEVEMENTS_QUERY = """
query PlayerAchievement($epicAccountId: String!, $sandboxId: String!) {
  PlayerAchievement {
    playerAchievementGameRecordsBySandbox(
      epicAccountId: $epicAccountId
      sandboxId: $sandboxId
    ) {
      records {
        totalXP
        totalUnlocked
        playerAwards { awardType unlockedDateTime achievementSetId }
        achievementSets { achievementSetId isBase totalUnlocked totalXP }
        playerAchievements {
          playerAchievement {
            sandboxId
            epicAccountId
            unlocked
            progress
            XP
            unlockDate
            achievementName
            isBase
            achievementSetId
          }
        }
      }
    }
  }
}
"""


class EpicAPIError(Exception):
    """Raised when Epic returns an unexpected or failed response."""


def _request(
    method: str,
    url: str,
    *,
    access_token: str | None = None,
    headers: dict[str, str] | None = None,
    **kwargs: Any,
) -> Any:
    """Send one authenticated request and return decoded JSON."""
    request_headers = {"User-Agent": USER_AGENT}
    if headers:
        request_headers.update(headers)
    if access_token:
        request_headers["Authorization"] = f"bearer {access_token}"

    try:
        response = http_client.request(
            method, url, headers=request_headers, logger_name="epic", **kwargs
        )
    except http_client.ExternalRequestError as exc:
        raise EpicAPIError("Epic API is unavailable.") from exc

    if response.status_code == 401:
        # Recoverable: the caller refreshes the token and retries once.
        raise EpicAuthError("Epic access token was rejected.", needs_reauth=False)
    if response.status_code == 403:
        raise EpicAPIError("Epic denied access to this resource.")
    if response.status_code >= 400:
        raise EpicAPIError(f"Epic API returned HTTP {response.status_code}.")

    try:
        return response.json()
    except ValueError as exc:
        raise EpicAPIError("Epic API returned unreadable JSON.") from exc


def fetch_library(access_token: str) -> list[dict[str, Any]]:
    """Return every record from the account's library service, following cursors."""
    records: list[dict[str, Any]] = []
    cursor: str | None = None
    for _page in range(MAX_LIBRARY_PAGES):
        params: dict[str, str] = {"includeMetadata": "true"}
        if cursor:
            params["cursor"] = cursor
        payload = _request("get", LIBRARY_URL, access_token=access_token, params=params)
        records.extend(payload.get("records") or [])
        cursor = (payload.get("responseMetadata") or {}).get("nextCursor")
        if not cursor:
            break
    else:
        logger.warning("Epic library pagination hit the %s page cap", MAX_LIBRARY_PAGES)
    return records


def fetch_playtime(access_token: str, account_id: str) -> dict[str, int]:
    """Return cumulative playtime seconds keyed by artifact id.

    The launcher publishes playtime to the library service, and this endpoint
    returns the account's totals. ``artifactId`` is the launcher ``appName``
    from the library records. The payload carries no session timestamps, so
    this is total playtime only (no last-played date).
    """
    if not account_id:
        return {}

    payload = _request(
        "get",
        PLAYTIME_URL.format(account_id=account_id),
        access_token=access_token,
    )
    if not isinstance(payload, list):
        raise EpicAPIError("Epic playtime returned an unexpected payload.")

    playtime: dict[str, int] = {}
    for row in payload:
        if not isinstance(row, dict):
            continue
        artifact_id = str(row.get("artifactId") or "")
        try:
            seconds = int(row.get("totalTime") or 0)
        except (TypeError, ValueError):
            continue
        if artifact_id and seconds > 0:
            playtime[artifact_id] = max(playtime.get(artifact_id, 0), seconds)
    return playtime


def fetch_entitlements(access_token: str, account_id: str) -> list[dict[str, Any]]:
    """Return every entitlement for the account, following pagination."""
    if not account_id:
        return []
    url = ENTITLEMENTS_URL.format(account_id=account_id)
    entitlements: list[dict[str, Any]] = []
    for _page in range(MAX_LIBRARY_PAGES):
        payload = _request(
            "get",
            url,
            access_token=access_token,
            params={"start": len(entitlements), "count": ENTITLEMENT_PAGE_SIZE},
        )
        page = payload if isinstance(payload, list) else []
        entitlements.extend(page)
        if len(page) < ENTITLEMENT_PAGE_SIZE:
            break
    return entitlements


def fetch_catalog_item(
    namespace: str, catalog_item_id: str, access_token: str | None = None
) -> dict[str, Any]:
    """Return catalog metadata for one product, or ``{}`` when unavailable.

    The metadata itself is public, but ``catalog-public-service`` still requires
    a bearer token: without one it answers 401 and every game falls back to its
    internal codename. Pass the account's access token (or a client-credentials
    token) to authenticate the lookup, and cache results for a week.
    """
    cache_key = f"epic_catalog:{namespace}:{catalog_item_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    url = CATALOG_URL.format(namespace=namespace)
    try:
        payload = _request(
            "get",
            url,
            access_token=access_token,
            params={
                "id": catalog_item_id,
                "includeDLCDetails": "true",
                "includeMainGameDetails": "true",
                "country": "US",
                "locale": "en",
            },
        )
    except (EpicAPIError, EpicAuthError) as exc:
        logger.warning("Epic catalog lookup failed for %s: %s", catalog_item_id, exc)
        return {}

    item = payload.get(catalog_item_id) if isinstance(payload, dict) else None
    result = item if isinstance(item, dict) else {}
    if result:
        cache.set(cache_key, result, CATALOG_CACHE_TTL)
    return result


def fetch_catalog_metadata(
    namespace: str, candidates: Iterable[str], access_token: str | None = None
) -> dict[str, Any]:
    """Return metadata for the first build id that resolves in the catalog.

    A namespace can list several applications, and some build ids have no
    catalog entry, so fall back through the candidates until one has a title.
    """
    for item_id in candidates:
        metadata = fetch_catalog_item(namespace, item_id, access_token)
        if metadata.get("title"):
            return metadata
    return {}


def _pick_image(item: dict[str, Any]) -> str:
    """Return the best cover image URL from a catalog item."""
    images = item.get("keyImages") or []
    by_type = {
        image.get("type"): image.get("url")
        for image in images
        if isinstance(image, dict) and image.get("url")
    }
    for image_type in CATALOG_IMAGE_PREFERENCE:
        if by_type.get(image_type):
            return by_type[image_type]
    for image in images:
        if isinstance(image, dict) and image.get("url"):
            return image["url"]
    return ""


def _graphql(
    access_token: str, query: str, variables: dict[str, Any]
) -> dict[str, Any]:
    """Run one Store GraphQL query and return its ``data`` object.

    The endpoint starts answering 429 when a large library is synced
    concurrently, so allow more retries (with the client's exponential backoff)
    than the default for other external services.
    """
    payload = _request(
        "post",
        GRAPHQL_URL,
        access_token=access_token,
        headers={"Content-Type": "application/json"},
        json={"query": query, "variables": variables},
        retries=4,
    )
    if not isinstance(payload, dict):
        raise EpicAPIError("Epic GraphQL returned an unexpected payload.")
    if payload.get("errors"):
        message = "; ".join(
            str(error.get("message", "unknown error"))
            for error in payload["errors"]
            if isinstance(error, dict)
        )
        raise EpicAPIError(f"Epic GraphQL error: {message or 'unknown error'}")
    return payload.get("data") or {}


def fetch_achievement_definitions(
    access_token: str, namespace: str, locale: str = "en"
) -> dict[str, Any]:
    """Return the product achievement catalog for one sandbox/namespace.

    Definitions are static product metadata, so cache them for a week: without
    this, a 500-game library costs 500 extra GraphQL calls on every sync.
    """
    cache_key = f"epic_achievement_definitions:{namespace}:{locale}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    data = _graphql(
        access_token,
        ACHIEVEMENT_DEFINITIONS_QUERY,
        {"sandboxId": namespace, "locale": locale},
    )
    achievement = data.get("Achievement") or {}
    record = achievement.get("productAchievementsRecordBySandbox") or {}
    if not isinstance(record, dict):
        return {}
    cache.set(
        cache_key,
        record,
        ACHIEVEMENT_DEFINITION_TTL if record.get("totalAchievements") else ACHIEVEMENT_EMPTY_TTL,
    )
    return record


def fetch_player_achievements(
    access_token: str, account_id: str, namespace: str
) -> dict[str, Any]:
    """Return the account's achievement state for one sandbox/namespace."""
    data = _graphql(
        access_token,
        PLAYER_ACHIEVEMENTS_QUERY,
        {"epicAccountId": account_id, "sandboxId": namespace},
    )
    player = data.get("PlayerAchievement") or {}
    record = player.get("playerAchievementGameRecordsBySandbox") or {}
    records = record.get("records") if isinstance(record, dict) else None
    if not records:
        return {}
    first = records[0] if isinstance(records, list) else {}
    return first if isinstance(first, dict) else {}


def _definition_list(record: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the nested achievement definition payload."""
    definitions: list[dict[str, Any]] = []
    for entry in record.get("achievements") or []:
        if not isinstance(entry, dict):
            continue
        definition = entry.get("achievement")
        if isinstance(definition, dict):
            definitions.append(definition)
    return definitions


def _player_state(record: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Index per-user achievement state by achievement name."""
    states: dict[str, dict[str, Any]] = {}
    for entry in record.get("playerAchievements") or []:
        if not isinstance(entry, dict):
            continue
        state = entry.get("playerAchievement")
        if isinstance(state, dict) and state.get("achievementName"):
            states[str(state["achievementName"])] = state
    return states


def merge_achievements(
    definitions: dict[str, Any], player: dict[str, Any]
) -> list[dict[str, Any]]:
    """Merge Epic definitions with the account's progress into storable rows."""
    rows: list[dict[str, Any]] = []
    states = _player_state(player)

    for definition in _definition_list(definitions):
        name = definition.get("name")
        if not name:
            continue

        state = states.get(str(name)) or {}
        unlocked = bool(state.get("unlocked"))

        display_name = (
            definition.get("unlockedDisplayName")
            if unlocked
            else definition.get("lockedDisplayName")
        ) or definition.get("unlockedDisplayName") or definition.get("lockedDisplayName") or name

        description = (
            definition.get("unlockedDescription")
            if unlocked
            else definition.get("lockedDescription")
        ) or definition.get("unlockedDescription") or definition.get("lockedDescription") or ""

        image = (
            definition.get("unlockedIconLink")
            if unlocked
            else definition.get("lockedIconLink")
        ) or definition.get("unlockedIconLink") or definition.get("lockedIconLink") or ""

        rarity = definition.get("rarity") or {}
        rarity_percent = rarity.get("percent") if isinstance(rarity, dict) else None

        try:
            progress = int(state.get("progress") or 0)
        except (TypeError, ValueError):
            progress = 100 if unlocked else 0

        try:
            xp = int(definition.get("XP") or state.get("XP") or 0)
        except (TypeError, ValueError):
            xp = 0

        rows.append(
            {
                "name": str(name),
                "display_name": str(display_name),
                "description": str(description),
                "image": str(image),
                "unlocked": unlocked,
                "unlock_time": (
                    parse_epic_datetime(state.get("unlockDate")) if unlocked else None
                ),
                "progress": progress,
                "xp": xp,
                "rarity_percent": (
                    float(rarity_percent) if rarity_percent is not None else None
                ),
                "hidden": bool(definition.get("hidden")),
                "is_base": bool(definition.get("isBase", True)),
            }
        )

    return rows


def _is_game_record(record: dict[str, Any]) -> bool:
    """Return whether a library record represents a launchable game.

    The library service returns ``recordType: APPLICATION`` records (with the
    build codename in ``appName`` for anything without a human-readable one).
    Entitlement records use ``entitlementType`` instead, so accept either field
    but reject audience/asset grants that are not applications.
    """
    if not record.get("appName") or not record.get("namespace"):
        return False
    record_type = str(
        record.get("recordType") or record.get("entitlementType") or ""
    ).upper()
    return record_type in ("", "APPLICATION", "EXECUTABLE")


def _record_priority(record: dict[str, Any]) -> tuple[int, str]:
    """Sort builds of one product: a human name beats a hex build codename."""
    app_name = str(record.get("appName") or "")
    is_hex = len(app_name) == 32 and all(
        character in "0123456789abcdef" for character in app_name
    )
    return (1 if is_hex else 0, str(record.get("acquisitionDate") or ""))


def collect_products(
    library: Iterable[dict[str, Any]], entitlements: Iterable[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Merge library records and executable entitlements into unique products.

    Epic lists several applications per product (Windows/Mac builds, content
    packs), so products are keyed by namespace and the best record is used for
    display. The remaining catalog item ids are kept as fallbacks for metadata
    lookups, because some build ids have no catalog entry.

    The library service is the primary source; entitlements cover titles that
    exist on the account but never made it into the library listing.
    """
    products: dict[str, dict[str, Any]] = {}

    for record in library:
        if not isinstance(record, dict) or not _is_game_record(record):
            continue
        namespace = str(record.get("namespace") or "")
        item_id = str(record.get("catalogItemId") or "")
        if not namespace or not item_id:
            continue

        candidate = {
            "catalog_item_id": item_id,
            "app_name": str(record.get("appName") or ""),
            "product_name": str(record.get("productName") or ""),
            "acquired_at": parse_epic_datetime(record.get("acquisitionDate")),
        }
        priority = _record_priority(record)
        existing = products.get(namespace)
        if existing is None:
            products[namespace] = {
                **candidate,
                "namespace": namespace,
                "candidates": [item_id],
                "app_names": [candidate["app_name"]],
                "_priority": priority,
            }
            continue

        existing["candidates"].append(item_id)
        existing["app_names"].append(candidate["app_name"])
        if priority < existing["_priority"]:
            existing.update(candidate)
            existing["_priority"] = priority

    for entitlement in entitlements:
        if not isinstance(entitlement, dict):
            continue
        if (entitlement.get("entitlementType") or "").upper() != "EXECUTABLE":
            continue
        if entitlement.get("active") is False:
            continue
        namespace = str(entitlement.get("namespace") or "")
        item_id = str(entitlement.get("catalogItemId") or "")
        if not namespace or not item_id or namespace in products:
            continue
        products[namespace] = {
            "namespace": namespace,
            "catalog_item_id": item_id,
            "app_name": str(entitlement.get("entitlementName") or ""),
            "product_name": "",
            "acquired_at": parse_epic_datetime(entitlement.get("createdAt")),
            "candidates": [item_id],
            "app_names": [str(entitlement.get("entitlementName") or "")],
        }

    for product in products.values():
        product["candidates"] = list(dict.fromkeys(product["candidates"]))
        product["app_names"] = list(
            dict.fromkeys(name for name in product["app_names"] if name)
        )
        product.pop("_priority", None)

    return list(products.values())


def _upsert_achievements(
    game: EpicGame, rows: list[dict[str, Any]]
) -> tuple[int, int]:
    """Bulk upsert achievement rows; returns ``(total, unlocked)``."""
    if not rows:
        return 0, 0
    objects = [EpicAchievement(game=game, **row) for row in rows]
    with transaction.atomic():
        EpicAchievement.objects.bulk_create(
            objects,
            update_conflicts=True,
            unique_fields=["game", "name"],
            update_fields=[
                "display_name",
                "description",
                "image",
                "unlocked",
                "unlock_time",
                "progress",
                "xp",
                "rarity_percent",
                "hidden",
                "is_base",
            ],
            batch_size=500,
        )
    unlocked = sum(1 for row in rows if row["unlocked"])
    return len(rows), unlocked


def _fetch_catalog_metadata(product: dict[str, Any], access_token: str) -> dict[str, Any]:
    """Fetch one product's metadata, falling back through its build ids."""
    return fetch_catalog_metadata(
        product["namespace"],
        product.get("candidates") or [product["catalog_item_id"]],
        access_token,
    )


def _fetch_achievement_rows(
    access_token: str, account_id: str, namespace: str
) -> tuple[list[dict[str, Any]], str | None]:
    """Return merged achievement rows for one sandbox, or an error message."""
    try:
        definitions = fetch_achievement_definitions(access_token, namespace)
        if not definitions.get("totalAchievements"):
            return [], None
        player = fetch_player_achievements(access_token, account_id, namespace)
        return merge_achievements(definitions, player), None
    except (EpicAPIError, EpicAuthError) as exc:
        return [], str(exc)


def _sync_products(
    user: User,
    tokens: dict[str, Any],
    persist: Callable[[str], None] | None,
) -> dict[str, Any]:
    """Sync one account's products and achievements into the database.

    Network work runs in a bounded thread pool because a large library means
    hundreds of catalog and GraphQL calls; database writes stay on this thread
    so a sync never holds a connection per worker.
    """
    access_token = tokens["access_token"]
    account_id = str(tokens.get("account_id") or "")
    started = time.monotonic()

    library = fetch_library(access_token)
    entitlements = fetch_entitlements(access_token, account_id)
    products = collect_products(library, entitlements)
    logger.info(
        "Epic library for user %s (account %s): %d library records, "
        "%d entitlements, %d unique products",
        user.pk,
        _mask_id(account_id),
        len(library),
        len(entitlements),
        len(products),
    )

    synced_games: list[EpicGame] = []
    achievement_games = 0
    warnings: list[str] = []

    # Map playtime artifacts (launcher app names) back to products. One product
    # can have several builds, and the launcher may report the same total for
    # each of them, so the largest total wins instead of being summed.
    app_name_to_namespace: dict[str, str] = {}
    for product in products:
        for app_name in product.get("app_names") or [product["app_name"]]:
            if app_name:
                app_name_to_namespace[app_name] = product["namespace"]

    playtime_started = time.monotonic()
    try:
        playtime_by_artifact = fetch_playtime(access_token, account_id)
    except EpicAPIError as exc:
        logger.warning("Epic playtime unavailable for user %s: %s", user.pk, exc)
        playtime_by_artifact = {}

    playtime_by_namespace: dict[str, int] = {}
    unmatched_playtime = 0
    for artifact_id, seconds in playtime_by_artifact.items():
        namespace = app_name_to_namespace.get(artifact_id)
        if namespace is None:
            unmatched_playtime += 1
            continue
        playtime_by_namespace[namespace] = max(
            playtime_by_namespace.get(namespace, 0), seconds
        )

    logger.info(
        "Epic playtime for user %s: %d artifacts, %d/%d games matched, %.1fh "
        "total in %.1fs",
        user.pk,
        len(playtime_by_artifact),
        len(playtime_by_namespace),
        len(products),
        sum(playtime_by_namespace.values()) / 3600,
        time.monotonic() - playtime_started,
    )
    if unmatched_playtime:
        logger.debug(
            "Epic playtime for user %s: %d artifacts had no library match",
            user.pk,
            unmatched_playtime,
        )

    metadata_started = time.monotonic()
    metadata_by_namespace: dict[str, dict[str, Any]] = {}
    if products:
        with ThreadPoolExecutor(max_workers=SYNC_WORKERS) as pool:
            fetcher = partial(_fetch_catalog_metadata, access_token=access_token)
            for product, metadata in zip(products, pool.map(fetcher, products)):
                if metadata:
                    metadata_by_namespace[product["namespace"]] = metadata
    logger.info(
        "Epic catalog metadata for user %s: %d/%d products resolved in %.1fs",
        user.pk,
        len(metadata_by_namespace),
        len(products),
        time.monotonic() - metadata_started,
    )

    created_count = updated_count = unchanged_count = 0

    for product in products:
        namespace = product["namespace"]
        item_id = product["catalog_item_id"]

        defaults = {
            "namespace": namespace,
            "appid": item_id,
            "app_name": product["app_name"][:255],
            "name": (
                product["product_name"] or product["app_name"] or item_id
            )[:255],
            "acquired_at": product["acquired_at"],
        }
        playtime_seconds = playtime_by_namespace.get(namespace)
        if playtime_seconds:
            # Round to the nearest minute, with a floor of 1 so a short session
            # does not display "0h 0m".
            defaults["playtime_minutes"] = max(1, round(playtime_seconds / 60))
            defaults["playtime_source"] = EpicGame.PLAYTIME_EPIC

        # Reconcile by namespace: a product's preferred catalog item can change
        # (library build vs. entitlement), and appid alone would create a
        # duplicate row for the same game.
        game = EpicGame.objects.filter(user=user, namespace=namespace).first()

        # A manual or agent-provided total is authoritative for this user; a
        # sync must not replace it with Epic's cumulative launcher total.
        if game is not None and game.playtime_source in (
            EpicGame.PLAYTIME_MANUAL,
            EpicGame.PLAYTIME_AGENT,
        ):
            defaults.pop("playtime_minutes", None)
            defaults.pop("playtime_source", None)

        if game is None:
            game, _created = EpicGame.objects.update_or_create(
                user=user, appid=item_id, defaults=defaults
            )
            created_count += 1
            status = "created"
        else:
            changed = [
                field
                for field, value in defaults.items()
                if getattr(game, field) != value
            ]
            for field in changed:
                setattr(game, field, defaults[field])
            if changed:
                game.save(update_fields=changed)
                updated_count += 1
                status = "updated"
            else:
                unchanged_count += 1
                status = "unchanged"

        metadata = metadata_by_namespace.get(namespace) or {}
        if metadata:
            game.description = metadata.get("description") or game.description
            game.developer = (metadata.get("developerDisplayName") or game.developer)[:255]
            game.publisher = (metadata.get("publisherDisplayName") or game.publisher)[:255]
            game.cover_image = _pick_image(metadata) or game.cover_image
            if metadata.get("title"):
                game.name = metadata["title"][:255]
            game.metadata = metadata
            game.save(
                update_fields=[
                    "description",
                    "developer",
                    "publisher",
                    "cover_image",
                    "name",
                    "metadata",
                ]
            )

        logger.debug(
            "Epic game %s [%s]: %s, %s",
            game.name,
            namespace,
            status,
            "metadata applied" if metadata else "no metadata",
        )
        synced_games.append(game)

    achievement_rows = 0
    if account_id and products:
        achievements_started = time.monotonic()
        with ThreadPoolExecutor(max_workers=SYNC_WORKERS) as pool:
            futures = {
                pool.submit(
                    _fetch_achievement_rows, access_token, account_id, product["namespace"]
                ): product
                for product in products
            }
            rows_by_namespace: dict[str, list[dict[str, Any]]] = {}
            errors_by_namespace: dict[str, str] = {}
            for future, product in futures.items():
                rows, error = future.result()
                if error:
                    errors_by_namespace[product["namespace"]] = error
                elif rows:
                    rows_by_namespace[product["namespace"]] = rows

        games_by_namespace = {game.namespace: game for game in synced_games}
        for namespace, rows in rows_by_namespace.items():
            game = games_by_namespace.get(namespace)
            if game is None:
                continue
            total, _unlocked = _upsert_achievements(game, rows)
            achievement_rows += total
            if total:
                achievement_games += 1

        for namespace, error in errors_by_namespace.items():
            game = games_by_namespace.get(namespace)
            name = game.name if game else namespace
            message = f"Achievements unavailable for {name}: {error}"
            logger.warning(message)
            if len(warnings) < 5:
                warnings.append(message)

        logger.info(
            "Epic achievements for user %s: %d/%d products have sets, "
            "%d rows stored in %.1fs (%d errors)",
            user.pk,
            achievement_games,
            len(products),
            achievement_rows,
            time.monotonic() - achievements_started,
            len(errors_by_namespace),
        )

    logger.info(
        "Epic sync finished for user %s in %.1fs: %d games "
        "(%d created, %d updated, %d unchanged), %d with achievements, "
        "%d warnings",
        user.pk,
        time.monotonic() - started,
        len(synced_games),
        created_count,
        updated_count,
        unchanged_count,
        achievement_games,
        len(warnings),
    )

    return {
        "games": synced_games,
        "synced": len(synced_games),
        "achievement_games": achievement_games,
        "warnings": warnings,
    }


def sync_library(
    user: User,
    stored_payload: str,
    persist: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """Refresh tokens as needed, then sync the account's Epic library.

    A mid-sync 401 triggers exactly one forced refresh and retry. A dead refresh
    token raises :class:`EpicAuthError` with ``needs_reauth=True`` so the caller
    can prompt the user instead of retrying forever.
    """
    tokens, _refreshed = ensure_fresh_tokens(stored_payload, persist)
    logger.info(
        "Epic sync starting for user %s (account %s)",
        user.pk,
        _mask_id(str(tokens.get("account_id") or "")),
    )

    try:
        return _sync_products(user, tokens, persist)
    except EpicAuthError as exc:
        if exc.needs_reauth:
            raise
        logger.info("Epic access token expired mid-sync; refreshing once")
        refreshed = refresh_access_token(tokens)
        if persist is not None:
            persist(serialize_epic_auth_payload(refreshed))
        return _sync_products(user, refreshed, persist)
