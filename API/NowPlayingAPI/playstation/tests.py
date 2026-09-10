from types import SimpleNamespace

from django.test import SimpleTestCase

from .auth import (
    PSN_AUTH_PAYLOAD_TYPE,
    parse_psn_auth_payload,
    serialize_psn_auth_payload,
)


class PSNAuthPayloadTests(SimpleTestCase):
    def test_parse_psn_auth_payload_rejects_legacy_npsso(self):
        self.assertIsNone(parse_psn_auth_payload("legacy-npsso-token"))

    def test_serialize_and_parse_psn_auth_payload(self):
        token_response = {
            "access_token": "access",
            "expires_in": 3600,
            "id_token": "id",
            "refresh_token": "refresh",
            "refresh_token_expires_in": 5183999,
            "scope": "psn:mobile.v2.core psn:clientapp",
            "token_type": "bearer",
            "access_token_expires_at": 123.0,
            "refresh_token_expires_at": 456.0,
        }
        psnawp = SimpleNamespace(
            authenticator=SimpleNamespace(token_response=token_response)
        )

        serialized = serialize_psn_auth_payload(psnawp)
        parsed = parse_psn_auth_payload(serialized)

        self.assertEqual(parsed["type"], PSN_AUTH_PAYLOAD_TYPE)
        self.assertEqual(parsed["token_response"], token_response)
