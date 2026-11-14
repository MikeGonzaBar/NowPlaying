"""Phase 0 spike: measure Epic's real payloads before trusting the adapter.

Standalone (no Django, no database). Requires only ``requests``.

1. Open the login URL printed by ``--print-login-url`` (or build it yourself):

       https://www.epicgames.com/id/login?redirectUrl=<urlencoded
       https://www.epicgames.com/id/api/redirect?clientId=<CLIENT_ID>&responseType=code>

2. After signing in, the browser lands on a page containing ``?code=...``.
   Copy the whole URL (or just the code) and run:

       python API/scripts/epic_spike.py --code "<url-or-code>" --out API/NowPlayingAPI/epic/tests/fixtures

3. Inspect the summary. It answers the two Phase 0 questions:

   * what ``expires_in`` / ``refresh_expires`` Epic actually returns, and
   * how many of the sampled games expose achievements at all.

Tokens are redacted before anything is written to disk. Pass ``--refresh`` to
test refresh-token rotation after the access token has expired.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

import requests

OAUTH_HOST = "account-public-service-prod03.ol.epicgames.com"
TOKEN_URL = f"https://{OAUTH_HOST}/account/api/oauth/token"
LIBRARY_URL = "https://library-service.live.use1a.on.epicgames.com/library/api/public/items"
ENTITLEMENTS_URL = (
    "https://entitlement-public-service-prod08.ol.epicgames.com"
    "/entitlement/api/account/{account_id}/entitlements"
)
CATALOG_URL = (
    "https://catalog-public-service-prod06.ol.epicgames.com"
    "/catalog/api/shared/namespace/{namespace}/bulk/items"
)
GRAPHQL_URL = "https://launcher.store.epicgames.com/graphql"

CLIENT_ID = os.environ.get("EPIC_CLIENT_ID", "34a02cf8f4414e29b15921876da36f9a")
CLIENT_SECRET = os.environ.get(
    "EPIC_CLIENT_SECRET", "daafbccc737745039dffe53d94fc76cf"
)
USER_AGENT = "EpicGamesLauncher/14.0.8-22004686+++Portal+Release-Live"

DEFINITIONS_QUERY = """
query Achievement($sandboxId: String!, $locale: String!) {
  Achievement {
    productAchievementsRecordBySandbox(sandboxId: $sandboxId, locale: $locale) {
      sandboxId
      totalAchievements
      achievements {
        achievement {
          name hidden isBase unlockedDisplayName lockedDisplayName
          unlockedDescription lockedDescription unlockedIconLink lockedIconLink
          XP rarity { percent }
        }
      }
    }
  }
}
"""

PLAYER_QUERY = """
query PlayerAchievement($epicAccountId: String!, $sandboxId: String!) {
  PlayerAchievement {
    playerAchievementGameRecordsBySandbox(
      epicAccountId: $epicAccountId
      sandboxId: $sandboxId
    ) {
      records {
        totalXP
        totalUnlocked
        playerAchievements {
          playerAchievement {
            unlocked progress unlockDate achievementName isBase
          }
        }
      }
    }
  }
}
"""


def login_url() -> str:
    redirect = (
        "https://www.epicgames.com/id/api/redirect"
        f"?clientId={CLIENT_ID}&responseType=code"
    )
    return f"https://www.epicgames.com/id/login?redirectUrl={quote(redirect, safe='')}"


def extract_code(value: str) -> str:
    value = value.strip()
    parsed = urlparse(value)
    if parsed.query:
        codes = parse_qs(parsed.query).get("code")
        if codes:
            return codes[0]
    return value


def token_request(data: dict[str, str]) -> dict:
    response = requests.post(
        TOKEN_URL,
        data=data,
        auth=(CLIENT_ID, CLIENT_SECRET),
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )
    payload = response.json()
    if response.status_code >= 400 or payload.get("errorCode"):
        raise SystemExit(f"Token request failed: {payload}")
    return payload


def get_json(url: str, token: str, params: dict | None = None) -> object:
    response = requests.get(
        url,
        params=params,
        headers={"User-Agent": USER_AGENT, "Authorization": f"bearer {token}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def graphql(token: str, query: str, variables: dict) -> dict:
    response = requests.post(
        GRAPHQL_URL,
        json={"query": query, "variables": variables},
        headers={"User-Agent": USER_AGENT, "Authorization": f"bearer {token}"},
        timeout=30,
    )
    payload = response.json()
    if payload.get("errors"):
        return {"errors": payload["errors"]}
    return payload.get("data") or {}


def redact(tokens: dict) -> dict:
    safe = dict(tokens)
    for key in ("access_token", "refresh_token"):
        if safe.get(key):
            safe[key] = "<redacted>"
    return safe


def fetch_library(token: str) -> tuple[list[dict], dict]:
    records: list[dict] = []
    cursor = None
    pages = 0
    while True:
        params = {"includeMetadata": "true"}
        if cursor:
            params["cursor"] = cursor
        page = get_json(LIBRARY_URL, token, params)
        records.extend(page.get("records") or [])
        pages += 1
        cursor = (page.get("responseMetadata") or {}).get("nextCursor")
        if not cursor:
            break
    return records, {"pages": pages}


def fetch_entitlements(token: str, account_id: str) -> list[dict]:
    entitlements: list[dict] = []
    while True:
        page = get_json(
            ENTITLEMENTS_URL.format(account_id=account_id),
            token,
            {"start": len(entitlements), "count": 1000},
        )
        page = page if isinstance(page, list) else []
        entitlements.extend(page)
        if len(page) < 1000:
            return entitlements


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--code", help="Authorization code or full redirect URL")
    parser.add_argument("--refresh", help="Refresh token to exercise rotation")
    parser.add_argument(
        "--out",
        default="API/NowPlayingAPI/epic/tests/fixtures",
        help="Directory for dumped payloads",
    )
    parser.add_argument(
        "--games", type=int, default=15, help="How many games to probe for achievements"
    )
    parser.add_argument("--print-login-url", action="store_true")
    args = parser.parse_args()

    if args.print_login_url:
        print(login_url())
        return 0

    if not args.code and not args.refresh:
        parser.error("pass --code or --refresh (or --print-login-url)")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    if args.code:
        tokens = token_request(
            {
                "grant_type": "authorization_code",
                "code": extract_code(args.code),
                "token_type": "eg1",
            }
        )
    else:
        tokens = token_request(
            {
                "grant_type": "refresh_token",
                "refresh_token": args.refresh,
                "token_type": "eg1",
            }
        )

    (out / "token.json").write_text(json.dumps(redact(tokens), indent=2), encoding="utf-8")
    print("Token lifetimes (the Phase 0 measurement):")
    print(f"  expires_in       = {tokens.get('expires_in')}")
    print(f"  expires_at       = {tokens.get('expires_at')}")
    print(f"  refresh_expires  = {tokens.get('refresh_expires')}")
    print(f"  refresh_expires_at = {tokens.get('refresh_expires_at')}")
    print(f"  account_id       = {tokens.get('account_id')}")

    access = tokens["access_token"]
    account_id = tokens.get("account_id", "")

    library, meta = fetch_library(access)
    (out / "library.json").write_text(json.dumps(library, indent=2), encoding="utf-8")
    print(f"\nLibrary: {len(library)} records over {meta['pages']} page(s)")

    entitlements = fetch_entitlements(access, account_id)
    (out / "entitlements.json").write_text(
        json.dumps(entitlements, indent=2), encoding="utf-8"
    )
    print(f"Entitlements: {len(entitlements)}")

    products = [
        record
        for record in library
        if record.get("appName") and record.get("namespace") and record.get("catalogItemId")
    ]
    sample = products[: args.games]
    print(f"Probing {len(sample)} game(s) for catalog metadata + achievements\n")

    catalog_payloads: dict[str, object] = {}
    achievement_report: list[tuple[str, int]] = []

    for record in sample:
        namespace = record["namespace"]
        item_id = record["catalogItemId"]
        name = record.get("productName") or record.get("appName")

        catalog = get_json(
            CATALOG_URL.format(namespace=namespace),
            access,
            {
                "id": item_id,
                "includeDLCDetails": "true",
                "includeMainGameDetails": "true",
                "country": "US",
                "locale": "en",
            },
        )
        catalog_payloads[item_id] = (catalog or {}).get(item_id, {})

        definitions = graphql(
            access, DEFINITIONS_QUERY, {"sandboxId": namespace, "locale": "en"}
        )
        record_defs = (
            (definitions.get("Achievement") or {})
            .get("productAchievementsRecordBySandbox")
            or {}
        )
        total = int(record_defs.get("totalAchievements") or 0)
        achievement_report.append((str(name), total))

        if total:
            player = graphql(
                access, PLAYER_QUERY, {"epicAccountId": account_id, "sandboxId": namespace}
            )
            (out / f"achievements_defs_{namespace}.json").write_text(
                json.dumps(record_defs, indent=2), encoding="utf-8"
            )
            (out / f"achievements_user_{namespace}.json").write_text(
                json.dumps(player, indent=2), encoding="utf-8"
            )

    (out / "catalog.json").write_text(
        json.dumps(catalog_payloads, indent=2), encoding="utf-8"
    )

    covered = sum(1 for _name, total in achievement_report if total)
    print("Achievement coverage:")
    for name, total in achievement_report:
        print(f"  {total:>3}  {name}")
    print(
        f"\n{covered}/{len(achievement_report)} sampled games expose Epic achievements "
        f"({(covered / len(achievement_report) * 100) if achievement_report else 0:.0f}%)"
    )
    print(f"Wrote payloads to {out}")

    if "playtime" in json.dumps(library).lower():
        print("\nNOTE: the library payload mentions playtime - inspect library.json!")
    else:
        print("\nNo playtime field found in the library payload (expected).")

    return 0


if __name__ == "__main__":
    sys.exit(main())
