"""JWT authentication for browser cookies and existing Bearer API clients."""

from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication


class _CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):  # type: ignore[no-untyped-def]
        return reason


def enforce_csrf(request: Request) -> None:
    """Apply Django's normal double-submit CSRF validation to an API request."""
    check = _CSRFCheck(lambda _request: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise PermissionDenied(f"CSRF Failed: {reason}")


class CookieJWTAuthentication(JWTAuthentication):
    """Use Authorization first, then an httpOnly access-token cookie.

    Cookie credentials are ambient browser credentials, so unsafe methods must
    pass CSRF validation. Explicit Authorization headers retain the existing
    stateless API-client contract and do not require a browser CSRF token.
    """

    def authenticate(self, request: Request):  # type: ignore[override]
        header = self.get_header(request)
        raw_token = self.get_raw_token(header) if header is not None else None
        from_cookie = raw_token is None
        if raw_token is None:
            raw_token = request.COOKIES.get(settings.AUTH_ACCESS_COOKIE_NAME)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        if from_cookie and request.method not in {"GET", "HEAD", "OPTIONS", "TRACE"}:
            enforce_csrf(request)
        return self.get_user(validated_token), validated_token
