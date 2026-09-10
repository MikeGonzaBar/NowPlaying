import json
from typing import Any

from psnawp_api import PSNAWP


PSN_AUTH_PAYLOAD_TYPE = "psn_auth_tokens"
PSN_AUTH_PAYLOAD_VERSION = 1


def parse_psn_auth_payload(raw_value: str | None) -> dict[str, Any] | None:
    """Parse a stored PlayStation auth payload if it is the token format."""
    if not raw_value:
        return None

    try:
        payload = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return None

    if not isinstance(payload, dict):
        return None

    if payload.get("type") != PSN_AUTH_PAYLOAD_TYPE:
        return None

    token_response = payload.get("token_response")
    if not isinstance(token_response, dict):
        return None

    if not token_response.get("refresh_token") or not token_response.get("access_token"):
        return None

    return payload


def serialize_psn_auth_payload(psnawp: PSNAWP) -> str | None:
    """Serialize PSNAWP token response data for encrypted storage."""
    token_response = getattr(psnawp.authenticator, "token_response", None)
    if not isinstance(token_response, dict):
        return None

    if not token_response.get("refresh_token") or not token_response.get("access_token"):
        return None

    payload = {
        "type": PSN_AUTH_PAYLOAD_TYPE,
        "version": PSN_AUTH_PAYLOAD_VERSION,
        "token_response": token_response,
    }
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def create_psnawp_from_stored_auth(stored_auth: str) -> tuple[PSNAWP, bool]:
    """Create a PSNAWP client from either token payloads or legacy NPSSO."""
    payload = parse_psn_auth_payload(stored_auth)
    if payload is None:
        return PSNAWP(stored_auth), False

    psnawp = PSNAWP("")
    psnawp.authenticator.token_response = payload["token_response"]
    return psnawp, True
