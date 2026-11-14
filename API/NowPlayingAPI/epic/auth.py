"""Epic Games account OAuth helpers.

Epic has no public user API. These are the endpoints and the public launcher
client that open-source launchers use:

    https://github.com/legendary-gl/legendary/blob/master/legendary/api/egs.py

The client id/secret below are constants shipped inside Epic's own launcher;
they are not user credentials, but Epic can change or invalidate them without
notice. See EPIC_INTEGRATION_PLAN.md before touching anything here.

Token lifetimes reported by Epic's token endpoint are short:

* access token  -> ``expires_in``     (typically 7200s / 2h)
* refresh token -> ``refresh_expires`` (typically 28800s / 8h)

A sync schedule longer than the refresh window cannot stay authenticated, so
every read path goes through :func:`ensure_fresh_tokens`.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone as datetime_timezone
from typing import Any, Callable
from urllib.parse import parse_qs, quote, urlparse

from django.conf import settings
from django.utils import timezone

import http_client

logger = logging.getLogger("epic")

OAUTH_HOST = "account-public-service-prod03.ol.epicgames.com"
TOKEN_URL = f"https://{OAUTH_HOST}/account/api/oauth/token"
VERIFY_URL = f"https://{OAUTH_HOST}/account/api/oauth/verify"
LOGIN_URL = "https://www.epicgames.com/id/login"

# Public launcher client (see module docstring). Overridable for testing or if
# Epic rotates the constants and a new launcher build ships with new ones.
#
# Do not substitute an Epic Dev Portal "Epic Online Services" client here (IDs
# start with ``xyza``). Those are EOS clients and Epic rejects them with
# ``errors.com.epicgames.accountportal.client_has_no_application``; they cannot
# read the Store library or Store achievements.
DEFAULT_CLIENT_ID = "34a02cf8f4414e29b15921876da36f9a"
DEFAULT_CLIENT_SECRET = "daafbccc737745039dffe53d94fc76cf"
USER_AGENT = "EpicGamesLauncher/14.0.8-22004686+++Portal+Release-Live"

#: Epic's error when the OAuth client is an EOS client rather than a launcher
#: client. Surfaced explicitly because the raw message ("the client has no
#: application associated") does not tell you what to fix.
EOS_CLIENT_ERROR = "errors.com.epicgames.accountportal.client_has_no_application"

AUTH_PAYLOAD_TYPE = "epic_auth_tokens"
AUTH_PAYLOAD_VERSION = 1

# Refresh a little before expiry so a sync never starts on a dying token.
REFRESH_SKEW = timedelta(minutes=5)


class EpicAuthError(Exception):
    """Raised when Epic authentication fails.

    ``needs_reauth`` distinguishes "the user must log in again" (dead refresh
    token, revoked session) from a transient outage that a retry may fix.
    """

    def __init__(self, message: str, *, needs_reauth: bool = False) -> None:
        super().__init__(message)
        self.needs_reauth = needs_reauth


def client_credentials() -> tuple[str, str]:
    """Return the launcher client id/secret, allowing environment overrides."""
    return (
        getattr(settings, "EPIC_CLIENT_ID", DEFAULT_CLIENT_ID),
        getattr(settings, "EPIC_CLIENT_SECRET", DEFAULT_CLIENT_SECRET),
    )


def parse_epic_datetime(value: object) -> datetime | None:
    """Parse an Epic ISO-8601 timestamp into an aware datetime.

    Handles the ``Z`` suffix, fractional seconds, and naive values.
    """
    if not value:
        return None
    if isinstance(value, datetime):
        return value if timezone.is_aware(value) else timezone.make_aware(value)
    text = str(value).strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        logger.warning("Unparseable Epic timestamp: %r", value)
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=datetime_timezone.utc)
    return parsed


def build_login_url(redirect_to: str | None = None) -> str:
    """Return the browser URL a user opens to authorize this flow.

    The flow redirects to ``.../id/api/redirect?clientId=...&responseType=code``
    and the user pastes that redirect back. The nested redirect must be
    percent-encoded: otherwise Epic parses ``clientId`` as a top-level query
    parameter of ``/id/login`` and fails with "client_id is required".
    ``redirect_to`` is an optional URL the login page should return to
    afterwards.
    """
    client_id, _secret = client_credentials()
    redirect = (
        "https://www.epicgames.com/id/api/redirect"
        f"?clientId={client_id}&responseType=code"
    )
    url = f"{LOGIN_URL}?redirectUrl={quote(redirect, safe='')}"
    if redirect_to:
        url += f"&redirectTo={quote(redirect_to, safe='')}"
    return url


def extract_authorization_code(raw_value: str) -> str:
    """Return the authorization code from a bare code or a pasted redirect URL."""
    value = (raw_value or "").strip()
    if not value:
        return ""
    if value.startswith("eg1~"):
        return value
    parsed = urlparse(value)
    if parsed.query:
        codes = parse_qs(parsed.query).get("code")
        if codes and codes[0]:
            return codes[0]
    if "code=" in value and "://" not in value:
        codes = parse_qs(value.split("?", 1)[-1]).get("code")
        if codes and codes[0]:
            return codes[0]
    return value


def normalize_token_response(payload: dict[str, Any]) -> dict[str, Any]:
    """Normalize a token endpoint payload for encrypted storage.

    Epic normally returns ``expires_at``/``refresh_expires_at`` already; the
    ``expires_in``/``refresh_expires`` fallbacks keep older responses usable.
    """
    access_token = payload.get("access_token")
    refresh_token = payload.get("refresh_token")
    if not access_token:
        raise EpicAuthError("Epic did not return an access token.", needs_reauth=True)
    if not refresh_token:
        raise EpicAuthError("Epic did not return a refresh token.", needs_reauth=True)

    now = timezone.now()
    expires_at = parse_epic_datetime(payload.get("expires_at"))
    if expires_at is None and payload.get("expires_in") is not None:
        try:
            expires_at = now + timedelta(seconds=int(payload["expires_in"]))
        except (TypeError, ValueError):
            expires_at = None

    refresh_expires_at = parse_epic_datetime(payload.get("refresh_expires_at"))
    if refresh_expires_at is None and payload.get("refresh_expires") is not None:
        try:
            refresh_expires_at = now + timedelta(seconds=int(payload["refresh_expires"]))
        except (TypeError, ValueError):
            refresh_expires_at = None

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": payload.get("token_type", "bearer"),
        "account_id": payload.get("account_id", ""),
        "display_name": payload.get("displayName", ""),
        "scope": payload.get("scope", ""),
        "expires_at": expires_at.isoformat() if expires_at else "",
        "refresh_expires_at": refresh_expires_at.isoformat() if refresh_expires_at else "",
        "expires_in": payload.get("expires_in"),
        "refresh_expires": payload.get("refresh_expires"),
    }


def serialize_epic_auth_payload(token_response: dict[str, Any]) -> str:
    """Serialize normalized tokens into the encrypted payload stored in UserApiKey."""
    payload = {
        "type": AUTH_PAYLOAD_TYPE,
        "version": AUTH_PAYLOAD_VERSION,
        "token_response": token_response,
    }
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def parse_epic_auth_payload(raw_value: str | None) -> dict[str, Any] | None:
    """Parse a stored Epic token payload, or ``None`` for legacy/foreign values."""
    if not raw_value:
        return None
    try:
        payload = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    if payload.get("type") != AUTH_PAYLOAD_TYPE:
        return None
    token_response = payload.get("token_response")
    if not isinstance(token_response, dict):
        return None
    if not token_response.get("access_token") or not token_response.get("refresh_token"):
        return None
    return token_response


def access_token_expires_at(tokens: dict[str, Any]) -> datetime | None:
    """Return the stored access-token expiry."""
    return parse_epic_datetime(tokens.get("expires_at"))


def refresh_token_expires_at(tokens: dict[str, Any]) -> datetime | None:
    """Return the stored refresh-token expiry."""
    return parse_epic_datetime(tokens.get("refresh_expires_at"))


def tokens_need_refresh(tokens: dict[str, Any]) -> bool:
    """Return whether the access token is expired or about to expire."""
    expires_at = access_token_expires_at(tokens)
    if expires_at is None:
        return False
    return expires_at - REFRESH_SKEW <= timezone.now()


def refresh_token_is_dead(tokens: dict[str, Any]) -> bool:
    """Return whether the refresh token is already past its expiry."""
    expires_at = refresh_token_expires_at(tokens)
    if expires_at is None:
        return False
    return expires_at <= timezone.now()


def is_session_expired(tokens: dict[str, Any]) -> bool:
    """Return whether the user must log in again (refresh window has lapsed)."""
    return refresh_token_is_dead(tokens)


def _post_token(data: dict[str, str]) -> dict[str, Any]:
    """POST to Epic's token endpoint and return the normalized response."""
    client_id, client_secret = client_credentials()
    try:
        response = http_client.post(
            TOKEN_URL,
            data=data,
            auth=(client_id, client_secret),
            headers={"User-Agent": USER_AGENT},
            logger_name="epic",
        )
    except http_client.ExternalRequestError as exc:
        raise EpicAuthError("Epic authentication service is unavailable.") from exc

    if response.status_code >= 500:
        raise EpicAuthError("Epic authentication service returned an error.")

    try:
        payload = response.json()
    except ValueError as exc:
        raise EpicAuthError("Epic returned an unreadable authentication response.") from exc

    if response.status_code >= 400 or payload.get("errorCode"):
        error_code = payload.get("errorCode") or f"http_{response.status_code}"
        message = payload.get("errorMessage") or "Epic rejected the authentication request."
        # 429 is transient; every other 4xx means the grant is no longer valid.
        transient = response.status_code == 429
        logger.warning("Epic token request failed (%s): %s", error_code, message)
        hint = ""
        if error_code == EOS_CLIENT_ERROR:
            hint = (
                " The configured EPIC_CLIENT_ID is an Epic Online Services client;"
                " only the launcher client can read the Store library. Leave"
                " EPIC_CLIENT_ID/EPIC_CLIENT_SECRET unset to use the default."
            )
        raise EpicAuthError(f"{message} ({error_code}){hint}", needs_reauth=not transient)

    return normalize_token_response(payload)


def exchange_authorization_code(code: str) -> dict[str, Any]:
    """Exchange a browser authorization code for access/refresh tokens."""
    return _post_token(
        {
            "grant_type": "authorization_code",
            "code": code,
            "token_type": "eg1",
        }
    )


def exchange_exchange_code(code: str) -> dict[str, Any]:
    """Exchange a short-lived launcher exchange code for tokens."""
    return _post_token(
        {
            "grant_type": "exchange_code",
            "exchange_code": code,
            "token_type": "eg1",
        }
    )


def refresh_access_token(tokens: dict[str, Any]) -> dict[str, Any]:
    """Refresh an access token, preserving account identity across the response.

    Epic rotates the refresh token on most refreshes. The caller is responsible
    for persisting the returned payload.
    """
    if refresh_token_is_dead(tokens):
        raise EpicAuthError(
            "Epic session expired. Please reconnect Epic Games.", needs_reauth=True
        )
    refreshed = _post_token(
        {
            "grant_type": "refresh_token",
            "refresh_token": tokens.get("refresh_token", ""),
            "token_type": "eg1",
        }
    )
    merged = {**tokens, **refreshed}
    # Epic may omit these on refresh; never lose them for the next cycle.
    for key in ("account_id", "display_name", "scope"):
        if not merged.get(key) and tokens.get(key):
            merged[key] = tokens[key]
    return merged


def ensure_fresh_tokens(
    stored_payload: str,
    persist: Callable[[str], None] | None = None,
) -> tuple[dict[str, Any], bool]:
    """Return usable tokens, refreshing and persisting them when needed.

    Returns ``(tokens, refreshed)``. Raises :class:`EpicAuthError` when the
    refresh window has lapsed (``needs_reauth=True``).
    """
    tokens = parse_epic_auth_payload(stored_payload)
    if tokens is None:
        raise EpicAuthError(
            "Stored Epic connection is invalid. Please reconnect Epic Games.",
            needs_reauth=True,
        )

    if not tokens_need_refresh(tokens):
        return tokens, False

    refreshed = refresh_access_token(tokens)
    if persist is not None:
        persist(serialize_epic_auth_payload(refreshed))
    return refreshed, True
