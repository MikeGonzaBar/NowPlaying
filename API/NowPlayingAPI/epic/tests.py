import json
from datetime import datetime, time, timezone as datetime_timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings

from rest_framework import status
from rest_framework.test import APITestCase

from users.models import SyncJob, UserApiKey
from users.sync_service import (
    INTERVAL_ONLY_PROVIDERS,
    PROVIDER_INTERVALS,
    enqueue_due_jobs,
    run_job,
)

from .api import (
    GRAPHQL_URL,
    EpicAPIError,
    fetch_catalog_item,
    fetch_playtime,
    merge_achievements,
    sync_library,
)
from .auth import (
    DEFAULT_CLIENT_ID,
    DEFAULT_CLIENT_SECRET,
    EOS_CLIENT_ERROR,
    EpicAuthError,
    build_login_url,
    ensure_fresh_tokens,
    exchange_authorization_code,
    extract_authorization_code,
    is_session_expired,
    normalize_token_response,
    parse_epic_auth_payload,
    serialize_epic_auth_payload,
)
from .models import EpicAchievement, EpicGame
from .testdata import (
    ACHIEVEMENT_DEFINITIONS,
    CATALOG_ITEMS,
    CELESTE_NAMESPACE,
    ENTITLEMENTS,
    HADES_NAMESPACE,
    LIBRARY_RECORDS,
    PLAYER_ACHIEVEMENTS,
    PLAYTIME_RESPONSE,
    TOKEN_RESPONSE,
)

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


class FakeResponse:
    """Minimal stand-in for ``requests.Response``."""

    def __init__(self, payload, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


def token_payload(**overrides):
    """Return a serialized token payload with optional expiry overrides."""
    return serialize_epic_auth_payload(
        normalize_token_response({**TOKEN_RESPONSE, **overrides})
    )


class EpicAuthPayloadTests(SimpleTestCase):
    def test_serialize_and_parse_roundtrip(self):
        serialized = serialize_epic_auth_payload(normalize_token_response(TOKEN_RESPONSE))

        parsed = parse_epic_auth_payload(serialized)

        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["access_token"], TOKEN_RESPONSE["access_token"])
        self.assertEqual(parsed["refresh_token"], TOKEN_RESPONSE["refresh_token"])
        self.assertEqual(parsed["account_id"], "account-123")

    def test_parse_rejects_foreign_payloads(self):
        self.assertIsNone(parse_epic_auth_payload(None))
        self.assertIsNone(parse_epic_auth_payload("not json"))
        self.assertIsNone(parse_epic_auth_payload(json.dumps({"type": "psn_auth_tokens"})))
        self.assertIsNone(
            parse_epic_auth_payload(
                json.dumps({"type": "epic_auth_tokens", "token_response": {"access_token": "x"}})
            )
        )

    def test_extract_code_from_bare_code(self):
        self.assertEqual(extract_authorization_code("  abc123  "), "abc123")

    def test_extract_code_from_redirect_url(self):
        url = "https://www.epicgames.com/id/api/redirect?code=abc123&state=xyz"
        self.assertEqual(extract_authorization_code(url), "abc123")

    @override_settings(
        EPIC_CLIENT_ID=DEFAULT_CLIENT_ID, EPIC_CLIENT_SECRET=DEFAULT_CLIENT_SECRET
    )
    def test_build_login_url_uses_launcher_client(self):
        url = build_login_url()
        self.assertIn("epicgames.com/id/login", url)
        self.assertIn(DEFAULT_CLIENT_ID, url)

    @override_settings(
        EPIC_CLIENT_ID="test-client-id", EPIC_CLIENT_SECRET="test-secret"
    )
    def test_build_login_url_encodes_nested_redirect(self):
        """Epic only reads clientId when it is inside the encoded redirectUrl."""
        url = build_login_url()
        query = parse_qs(urlparse(url).query)
        redirect = query["redirectUrl"][0]
        self.assertEqual(
            redirect,
            "https://www.epicgames.com/id/api/redirect"
            "?clientId=test-client-id&responseType=code",
        )
        # clientId must not leak into the outer /id/login query string.
        self.assertNotIn("clientId", query)

    def test_session_expiry_uses_refresh_window(self):
        live = parse_epic_auth_payload(token_payload())
        dead = parse_epic_auth_payload(
            token_payload(refresh_expires_at="2020-01-01T00:00:00.000Z")
        )

        self.assertFalse(is_session_expired(live))
        self.assertTrue(is_session_expired(dead))


class EpicTokenRefreshTests(SimpleTestCase):
    def test_ensure_fresh_tokens_refreshes_and_persists_rotation(self):
        stored = token_payload(expires_at="2020-01-01T00:00:00.000Z")
        persisted: list[str] = []
        rotated = normalize_token_response(
            {
                **TOKEN_RESPONSE,
                "access_token": "eg1~access-token-2",
                "refresh_token": "eg1~refresh-token-2",
            }
        )

        with patch("epic.auth._post_token", return_value=rotated) as post:
            tokens, refreshed = ensure_fresh_tokens(stored, persisted.append)

        self.assertTrue(refreshed)
        post.assert_called_once()
        self.assertEqual(post.call_args.args[0]["grant_type"], "refresh_token")
        self.assertEqual(tokens["access_token"], "eg1~access-token-2")
        # Rotation must be persisted, otherwise the session dies at ~8h.
        self.assertEqual(len(persisted), 1)
        self.assertEqual(
            parse_epic_auth_payload(persisted[0])["refresh_token"], "eg1~refresh-token-2"
        )

    def test_dead_refresh_token_requires_reauth(self):
        stored = token_payload(
            expires_at="2020-01-01T00:00:00.000Z",
            refresh_expires_at="2020-01-01T00:00:00.000Z",
        )

        with self.assertRaises(EpicAuthError) as raised:
            ensure_fresh_tokens(stored)

        self.assertTrue(raised.exception.needs_reauth)


class EpicClientErrorTests(SimpleTestCase):
    @override_settings(EPIC_CLIENT_ID="xyza7891example", EPIC_CLIENT_SECRET="secret")
    def test_eos_client_error_explains_the_misconfiguration(self):
        """An EOS client token request must say how to fix it, not just relay Epic."""

        class FakeResponse:
            status_code = 401

            def json(self):
                return {
                    "errorCode": EOS_CLIENT_ERROR,
                    "errorMessage": "El cliente no tiene ninguna aplicación asociada.",
                }

        with patch("epic.auth.http_client.post", return_value=FakeResponse()):
            with self.assertRaises(EpicAuthError) as raised:
                exchange_authorization_code("code")

        message = str(raised.exception)
        self.assertIn(EOS_CLIENT_ERROR, message)
        self.assertIn("Epic Online Services", message)
        self.assertIn("EPIC_CLIENT_ID", message)
        self.assertTrue(raised.exception.needs_reauth)


class EpicAchievementMergeTests(SimpleTestCase):
    def test_locked_and_unlocked_rows_use_the_right_variants(self):
        rows = merge_achievements(
            ACHIEVEMENT_DEFINITIONS[HADES_NAMESPACE],
            PLAYER_ACHIEVEMENTS[HADES_NAMESPACE],
        )
        by_name = {row["name"]: row for row in rows}

        unlocked = by_name["ACH_FIRST"]
        self.assertTrue(unlocked["unlocked"])
        self.assertEqual(
            unlocked["unlock_time"],
            datetime(2024, 2, 3, 4, 5, 6, tzinfo=datetime_timezone.utc),
        )
        self.assertEqual(unlocked["image"], "https://cdn.example/ach-first.png")
        self.assertEqual(unlocked["progress"], 100)

        locked = by_name["ACH_SECOND"]
        self.assertFalse(locked["unlocked"])
        self.assertIsNone(locked["unlock_time"])
        self.assertEqual(locked["progress"], 40)
        self.assertEqual(
            locked["description"], "Escape with a second weapon equipped."
        )
        self.assertEqual(locked["image"], "https://cdn.example/ach-second-gray.png")


@override_settings(CACHES=CACHES)
class EpicCatalogTests(SimpleTestCase):
    def test_catalog_lookup_authenticates(self):
        """catalog-public-service returns 401 without a bearer token."""
        with patch("epic.api._request", return_value={}) as request:
            fetch_catalog_item("catalog-ns", "catalog-item", "eg1~user-token")

        request.assert_called_once()
        self.assertEqual(request.call_args.kwargs["access_token"], "eg1~user-token")
        self.assertEqual(request.call_args.kwargs["params"]["id"], "catalog-item")


@override_settings(CACHES=CACHES)
class EpicPlaytimeTests(SimpleTestCase):
    def test_returns_seconds_keyed_by_artifact(self):
        with patch(
            "epic.api.http_client.request",
            return_value=FakeResponse(
                [
                    {"artifactId": "first", "totalTime": 120},
                    {"artifactId": "second", "totalTime": 60},
                    # Duplicate artifact rows keep the largest total.
                    {"artifactId": "first", "totalTime": 90},
                ]
            ),
        ):
            playtime = fetch_playtime("eg1~token", "account-123")

        self.assertEqual(playtime, {"first": 120, "second": 60})

    def test_skips_the_request_without_an_account_id(self):
        with patch("epic.api.http_client.request") as request:
            self.assertEqual(fetch_playtime("eg1~token", ""), {})

        request.assert_not_called()

    def test_rejects_an_unexpected_payload(self):
        with patch(
            "epic.api.http_client.request",
            return_value=FakeResponse({"records": []}),
        ):
            with self.assertRaises(EpicAPIError):
                fetch_playtime("eg1~token", "account-123")


@override_settings(CACHES=CACHES)
class EpicSyncTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = User.objects.create_user(
            username="epic-owner", email="epic@example.com", password="testpass123"
        )
        self.persisted: list[str] = []

        def route(method, url, **kwargs):
            if "library/api/public/items" in url:
                return FakeResponse({"records": LIBRARY_RECORDS, "responseMetadata": {}})
            if "/playtime/account/" in url:
                return FakeResponse(PLAYTIME_RESPONSE)
            if "/entitlement/api/account/" in url:
                return FakeResponse(ENTITLEMENTS)
            if "/bulk/items" in url:
                item_id = (kwargs.get("params") or {}).get("id")
                item = CATALOG_ITEMS.get(item_id)
                return FakeResponse({item_id: item} if item else {})
            if url == GRAPHQL_URL:
                body = kwargs.get("json") or {}
                namespace = (body.get("variables") or {}).get("sandboxId")
                if "productAchievementsRecordBySandbox" in body.get("query", ""):
                    record = ACHIEVEMENT_DEFINITIONS.get(namespace, {})
                    return FakeResponse(
                        {
                            "data": {
                                "Achievement": {
                                    "productAchievementsRecordBySandbox": record
                                }
                            }
                        }
                    )
                record = PLAYER_ACHIEVEMENTS.get(namespace, {})
                return FakeResponse(
                    {
                        "data": {
                            "PlayerAchievement": {
                                "playerAchievementGameRecordsBySandbox": {
                                    "records": [record]
                                }
                            }
                        }
                    }
                )
            raise AssertionError(f"Unexpected Epic URL: {url}")

        patcher = patch("epic.api.http_client.request", side_effect=route)
        self.route = route
        self.http = patcher.start()
        self.addCleanup(patcher.stop)

    def test_sync_persists_games_metadata_and_achievements(self):
        result = sync_library(
            self.user,
            token_payload(),
            persist=self.persisted.append,
        )

        self.assertEqual(result["synced"], 3)
        self.assertEqual(EpicGame.objects.filter(user=self.user).count(), 3)
        self.assertEqual(result["achievement_games"], 1)

        hades = EpicGame.objects.get(user=self.user, appid="cat_hades")
        self.assertEqual(hades.namespace, HADES_NAMESPACE)
        self.assertEqual(hades.name, "Hades")
        self.assertEqual(hades.developer, "Supergiant Games")
        self.assertEqual(hades.cover_image, "https://cdn.example/hades-tall.jpg")
        self.assertIsNotNone(hades.acquired_at)
        # Both builds report 7800 and 9000 seconds: the larger duplicate wins.
        self.assertEqual(hades.playtime_minutes, 150)
        self.assertEqual(hades.playtime_source, EpicGame.PLAYTIME_EPIC)
        self.assertTrue(hades.playtime_known)
        self.assertEqual(hades.convert_playtime(), "2h 30m")

        achievements = {
            achievement.name: achievement
            for achievement in EpicAchievement.objects.filter(game=hades)
        }
        self.assertEqual(set(achievements), {"ACH_FIRST", "ACH_SECOND"})
        self.assertTrue(achievements["ACH_FIRST"].unlocked)
        self.assertEqual(
            achievements["ACH_FIRST"].unlock_time,
            datetime(2024, 2, 3, 4, 5, 6, tzinfo=datetime_timezone.utc),
        )
        self.assertFalse(achievements["ACH_SECOND"].unlocked)
        self.assertEqual(achievements["ACH_SECOND"].progress, 40)
        self.assertEqual(achievements["ACH_SECOND"].rarity_percent, 4.25)

        celeste = EpicGame.objects.get(user=self.user, appid="cat_celeste")
        self.assertEqual(celeste.achievements.count(), 0)

    def test_non_executable_records_are_ignored(self):
        sync_library(self.user, token_payload(), persist=self.persisted.append)

        self.assertFalse(
            EpicGame.objects.filter(user=self.user, namespace="ns_audience").exists()
        )

    def test_multiple_builds_of_one_product_are_deduped(self):
        """The library lists every build; a product is one game."""
        sync_library(self.user, token_payload(), persist=self.persisted.append)

        self.assertEqual(
            EpicGame.objects.filter(user=self.user, namespace=HADES_NAMESPACE).count(),
            1,
        )
        hades = EpicGame.objects.get(user=self.user, namespace=HADES_NAMESPACE)
        # The human-readable build wins over the hex build codename.
        self.assertEqual(hades.appid, "cat_hades")

    def test_entitlement_only_titles_are_included(self):
        sync_library(self.user, token_payload(), persist=self.persisted.append)

        self.assertTrue(
            EpicGame.objects.filter(user=self.user, appid="cat_unlisted").exists()
        )

    def test_playtime_is_attached_to_the_matching_game(self):
        sync_library(self.user, token_payload(), persist=self.persisted.append)

        celeste = EpicGame.objects.get(user=self.user, namespace=CELESTE_NAMESPACE)
        self.assertEqual(celeste.playtime_minutes, 60)
        self.assertEqual(celeste.playtime_source, EpicGame.PLAYTIME_EPIC)

        # The unmatched artifact must not be guessed onto the entitlement-only game.
        unlisted = EpicGame.objects.get(user=self.user, namespace="ns_unlisted")
        self.assertEqual(unlisted.playtime_source, EpicGame.PLAYTIME_UNKNOWN)
        self.assertFalse(unlisted.playtime_known)

    def test_sync_does_not_overwrite_manual_playtime(self):
        EpicGame.objects.create(
            user=self.user,
            appid="cat_hades",
            namespace=HADES_NAMESPACE,
            name="Hades",
            playtime_minutes=5000,
            playtime_source=EpicGame.PLAYTIME_MANUAL,
        )

        sync_library(self.user, token_payload(), persist=self.persisted.append)

        hades = EpicGame.objects.get(user=self.user, namespace=HADES_NAMESPACE)
        self.assertEqual(hades.playtime_minutes, 5000)
        self.assertEqual(hades.playtime_source, EpicGame.PLAYTIME_MANUAL)

    def test_sync_is_idempotent(self):
        sync_library(self.user, token_payload(), persist=self.persisted.append)
        sync_library(self.user, token_payload(), persist=self.persisted.append)

        self.assertEqual(EpicGame.objects.filter(user=self.user).count(), 3)
        self.assertEqual(
            EpicAchievement.objects.filter(game__user=self.user).count(), 2
        )

    def test_mid_sync_401_refreshes_once_and_retries(self):
        from .auth import EpicAuthError as AuthError

        calls = {"count": 0}

        def flaky(method, url, **kwargs):
            if "library/api/public/items" in url and calls["count"] == 0:
                calls["count"] += 1
                raise AuthError("expired", needs_reauth=False)
            return self.route(method, url, **kwargs)

        rotated = normalize_token_response(
            {**TOKEN_RESPONSE, "access_token": "eg1~access-token-2"}
        )
        with patch("epic.api.http_client.request", side_effect=flaky), patch(
            "epic.api.refresh_access_token", return_value=rotated
        ):
            result = sync_library(
                self.user, token_payload(), persist=self.persisted.append
            )

        self.assertEqual(result["synced"], 3)
        self.assertEqual(len(self.persisted), 1)
        self.assertEqual(
            parse_epic_auth_payload(self.persisted[0])["access_token"],
            "eg1~access-token-2",
        )


@override_settings(CACHES=CACHES)
class EpicViewSetTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = User.objects.create_user(
            username="epic-viewer", email="viewer@example.com", password="testpass123"
        )
        self.other = User.objects.create_user(username="epic-other")
        self.client.force_authenticate(user=self.user)

    def _connect(self):
        key, _created = UserApiKey.objects.get_or_create(
            user=self.user, service_name="epic"
        )
        key.set_key(token_payload(), service_user_id="account-123")
        key.save()
        return key

    def test_authenticate_stores_encrypted_tokens(self):
        with patch(
            "epic.views.exchange_authorization_code",
            return_value=normalize_token_response(TOKEN_RESPONSE),
        ):
            response = self.client.post(
                "/epic/authenticate/",
                {
                    "redirect_url": "https://www.epicgames.com/id/api/redirect?code=abc123"
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["account_id"], "account-123")

        key = UserApiKey.objects.get(user=self.user, service_name="epic")
        self.assertEqual(key.service_user_id, "account-123")
        self.assertNotIn("eg1~access-token-1", key.key_hash)
        self.assertEqual(
            parse_epic_auth_payload(key.get_key())["refresh_token"],
            "eg1~refresh-token-1",
        )

    def test_authenticate_rejects_missing_code(self):
        response = self.client.post("/epic/authenticate/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_auth_status_without_connection(self):
        response = self.client.get("/epic/auth-status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["connected"])
        self.assertFalse(response.data["expired"])

    def test_auth_status_reports_expired_session(self):
        key, _ = UserApiKey.objects.get_or_create(
            user=self.user, service_name="epic"
        )
        key.set_key(
            token_payload(refresh_expires_at="2020-01-01T00:00:00.000Z"),
            service_user_id="account-123",
        )
        key.save()

        response = self.client.get("/epic/auth-status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["connected"])
        self.assertTrue(response.data["expired"])
        self.assertTrue(response.data["needs_reauth"])

    def test_get_game_list_requires_reauth_when_session_is_dead(self):
        key, _ = UserApiKey.objects.get_or_create(
            user=self.user, service_name="epic"
        )
        key.set_key(
            token_payload(
                expires_at="2020-01-01T00:00:00.000Z",
                refresh_expires_at="2020-01-01T00:00:00.000Z",
            ),
            service_user_id="account-123",
        )
        key.save()

        response = self.client.get("/epic/get-game-list/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(response.data["needs_reauth"])

    def test_stored_endpoints_are_user_scoped(self):
        EpicGame.objects.create(
            user=self.user, appid="cat-own", namespace="ns-own", name="Owned"
        )
        EpicGame.objects.create(
            user=self.other, appid="cat-other", namespace="ns-other", name="Other"
        )

        listing = self.client.get("/epic/get-game-list-stored/")
        achieved = self.client.get("/epic/get-game-list-most-achieved/")

        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual([game["appid"] for game in listing.data["result"]], ["cat-own"])
        self.assertEqual(achieved.status_code, status.HTTP_200_OK)
        self.assertEqual([game["appid"] for game in achieved.data["result"]], ["cat-own"])

    def test_stored_payload_reports_unknown_playtime(self):
        game = EpicGame.objects.create(
            user=self.user, appid="cat-own", namespace="ns-own", name="Owned"
        )
        EpicAchievement.objects.create(
            game=game, name="ACH_ONE", display_name="One", unlocked=True
        )

        response = self.client.get("/epic/get-game-list-stored/")

        payload = response.data["result"][0]
        self.assertFalse(payload["playtime_known"])
        self.assertEqual(payload["playtime_formatted"], "")
        self.assertEqual(payload["total_achievements"], 1)
        self.assertEqual(payload["unlocked_achievements_count"], 1)
        self.assertEqual(payload["img_icon_url"], payload["cover_image"])


class EpicScheduleTests(TestCase):
    def test_epic_is_registered_with_a_sub_refresh_interval(self):
        self.assertIn("epic", PROVIDER_INTERVALS)
        self.assertLess(PROVIDER_INTERVALS["epic"].total_seconds(), 8 * 3600)
        self.assertIn("epic", INTERVAL_ONLY_PROVIDERS)

    def test_epic_ignores_a_daily_sync_time(self):
        user = User.objects.create_user(username="epic-schedule")
        UserApiKey.objects.create(
            user=user,
            service_name="epic",
            key_hash="ciphertext",
            sync_enabled=True,
            sync_time=time(3, 0),
            sync_timezone="UTC",
        )
        now = datetime(2026, 11, 10, 12, 0, tzinfo=datetime_timezone.utc)

        enqueue_due_jobs(now=now)

        self.assertTrue(SyncJob.objects.filter(user=user, provider="epic").exists())


class EpicSyncFailureTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="epic-expired")
        key = UserApiKey.objects.create(
            user=self.user, service_name="epic", key_hash=""
        )
        key.set_key(token_payload(), service_user_id="account-123")
        key.save()

    def test_dead_refresh_token_fails_without_retrying(self):
        job = SyncJob.objects.create(user=self.user, provider="epic")

        with patch(
            "epic.api.sync_library",
            side_effect=EpicAuthError("refresh token expired", needs_reauth=True),
        ):
            self.assertFalse(run_job(job))

        job.refresh_from_db()
        self.assertEqual(job.status, SyncJob.FAILED)
        self.assertIsNone(job.next_retry_at)
        self.assertIn("refresh token expired", job.error)
