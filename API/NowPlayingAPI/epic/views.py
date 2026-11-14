from __future__ import annotations

import logging
import time
from typing import cast

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, F, Q, QuerySet
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from users.credentials import (
    InvalidServiceCredentials,
    MissingServiceCredentials,
)
from users.models import UserApiKey

from .api import _mask_id, sync_library
from .auth import (
    EpicAuthError,
    build_login_url,
    exchange_authorization_code,
    extract_authorization_code,
    is_session_expired,
    parse_epic_auth_payload,
    parse_epic_datetime,
    refresh_access_token,
    serialize_epic_auth_payload,
)
from .models import EpicGame
from .serializers import EpicSerializer

SERVICE_NAME = "epic"

logger = logging.getLogger("epic")

# pyright: reportAttributeAccessIssue=false


def _persist_tokens(key: UserApiKey):
    """Return a callback that stores a rotated Epic token payload."""

    def persist(value: str) -> None:
        key.set_key(value)
        key.save(update_fields=["key_hash", "updated_at"])

    return persist


@extend_schema_view(
    getGameList=extend_schema(
        summary="Fetch and sync the authenticated user's Epic Games library",
        responses={200: OpenApiTypes.OBJECT, 401: OpenApiTypes.OBJECT, 502: OpenApiTypes.OBJECT},
    ),
    authenticateEpic=extend_schema(
        summary="Connect an Epic account from an authorization code or redirect URL",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
    ),
    authStatus=extend_schema(
        summary="Report whether the stored Epic session is usable",
        responses={200: OpenApiTypes.OBJECT},
    ),
    getGameListStored=extend_schema(
        summary="List stored Epic games", responses={200: EpicSerializer(many=True)}
    ),
    getGameListMostAchieved=extend_schema(
        summary="List stored Epic games sorted by achievement completion",
        responses={200: EpicSerializer(many=True)},
    ),
)
class EpicViewSet(viewsets.ModelViewSet):
    """Expose Epic library sync, connection status, and stored game views."""

    queryset = EpicGame.objects.none()
    serializer_class = EpicSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[EpicGame]:  # pyright: ignore[reportIncompatibleMethodOverride]
        """Return only Epic games owned by the authenticated user."""
        return EpicGame.objects.filter(user=self.request.user).order_by("id")

    def _connection(self) -> tuple[UserApiKey, str]:
        """Return the user's Epic connection and its decrypted token payload."""
        try:
            key = UserApiKey.objects.get(user=self.request.user, service_name=SERVICE_NAME)
        except UserApiKey.DoesNotExist as exc:
            raise MissingServiceCredentials(
                "No Epic Games connection found. Please connect Epic in profile settings."
            ) from exc

        stored = key.get_key()
        if not stored:
            raise InvalidServiceCredentials(
                "Could not decrypt the stored Epic connection. Please connect Epic again."
            )
        return key, stored

    @action(detail=False, methods=["post"], url_path="authenticate")
    def authenticateEpic(self, request: Request) -> Response:
        """Exchange a pasted authorization code (or redirect URL) for tokens.

        Epic must be configured with the launcher client id shown by
        ``GET /epic/login-url/`` before the redirect contains a usable code.
        The raw code is not retained after the exchange.
        """
        data = cast(dict, request.data)
        raw_value = data.get("code") or data.get("redirect_url") or ""
        code = extract_authorization_code(str(raw_value))
        if not code:
            return Response(
                {"error": "An Epic authorization code or redirect URL is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tokens = exchange_authorization_code(code)
        except EpicAuthError as exc:
            logger.warning(
                "Epic connect failed for user %s: %s (needs_reauth=%s)",
                request.user.pk,
                exc,
                exc.needs_reauth,
            )
            return Response(
                {"error": str(exc), "needs_reauth": exc.needs_reauth},
                status=status.HTTP_400_BAD_REQUEST,
            )

        key, _created = UserApiKey.objects.get_or_create(
            user=request.user, service_name=SERVICE_NAME
        )
        key.set_key(
            serialize_epic_auth_payload(tokens),
            service_user_id=str(tokens.get("account_id") or ""),
        )
        key.save()
        cache.delete(f"epic_stored_{request.user.id}")
        logger.info(
            "Epic account connected for user %s (account %s)",
            request.user.pk,
            _mask_id(str(tokens.get("account_id") or "")),
        )

        return Response(
            {
                "message": "Epic Games connected successfully.",
                "account_id": tokens.get("account_id", ""),
                "display_name": tokens.get("display_name", ""),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="login-url")
    def loginUrl(self, request: Request) -> Response:
        """Return the Epic login URL the user must open to obtain a code."""
        return Response({"login_url": build_login_url()})

    @action(detail=False, methods=["get"], url_path="auth-status")
    def authStatus(self, request: Request) -> Response:
        """Report whether the stored tokens can still be used."""
        key = self.request.user.api_keys.filter(service_name=SERVICE_NAME).first()
        if key is None:
            return Response(
                {"connected": False, "expired": False, "needs_reauth": False}
            )

        tokens = parse_epic_auth_payload(key.get_key() or "")
        if tokens is None:
            return Response(
                {
                    "connected": True,
                    "expired": True,
                    "needs_reauth": True,
                    "reason": "invalid_payload",
                }
            )

        expired = is_session_expired(tokens)
        refresh_expires_at = parse_epic_datetime(tokens.get("refresh_expires_at"))
        access_expires_at = parse_epic_datetime(tokens.get("expires_at"))
        return Response(
            {
                "connected": True,
                "expired": expired,
                "needs_reauth": expired,
                "account_id": tokens.get("account_id", ""),
                "display_name": tokens.get("display_name", ""),
                "access_expires_at": access_expires_at.isoformat() if access_expires_at else None,
                "refresh_expires_at": refresh_expires_at.isoformat() if refresh_expires_at else None,
            }
        )

    @action(detail=False, methods=["post"], url_path="refresh-token")
    def refreshToken(self, request: Request) -> Response:
        """Force a token refresh and persist the rotated refresh token."""
        key, stored = self._connection()
        tokens = parse_epic_auth_payload(stored)
        if tokens is None:
            raise InvalidServiceCredentials(
                "Stored Epic connection is invalid. Please reconnect Epic."
            )
        try:
            refreshed = refresh_access_token(tokens)
        except EpicAuthError as exc:
            logger.warning(
                "Epic token refresh failed for user %s: %s (needs_reauth=%s)",
                request.user.pk,
                exc,
                exc.needs_reauth,
            )
            return Response(
                {"error": str(exc), "needs_reauth": exc.needs_reauth},
                status=status.HTTP_401_UNAUTHORIZED if exc.needs_reauth else 502,
            )

        _persist_tokens(key)(serialize_epic_auth_payload(refreshed))
        logger.info(
            "Epic token refreshed for user %s (access expires %s)",
            request.user.pk,
            refreshed.get("expires_at"),
        )
        return Response(
            {
                "message": "Epic session refreshed.",
                "expires_at": refreshed.get("expires_at"),
                "refresh_expires_at": refreshed.get("refresh_expires_at"),
            }
        )

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request: Request) -> Response:
        """Fetch the Epic library, catalog metadata and achievements, then store them."""
        key, stored = self._connection()
        key.update_last_used()
        started = time.monotonic()
        logger.info("Epic manual sync requested for user %s", request.user.pk)

        try:
            result = sync_library(
                request.user, stored, persist=_persist_tokens(key)
            )
        except EpicAuthError as exc:
            logger.warning(
                "Epic manual sync failed for user %s after %.1fs: %s "
                "(needs_reauth=%s)",
                request.user.pk,
                time.monotonic() - started,
                exc,
                exc.needs_reauth,
            )
            return Response(
                {"error": str(exc), "needs_reauth": exc.needs_reauth},
                status=(
                    status.HTTP_401_UNAUTHORIZED
                    if exc.needs_reauth
                    else status.HTTP_502_BAD_GATEWAY
                ),
            )
        except Exception:
            logger.exception(
                "Epic manual sync crashed for user %s after %.1fs",
                request.user.pk,
                time.monotonic() - started,
            )
            raise

        games = cast(list[EpicGame], result["games"])
        payload = EpicSerializer(games, many=True).data
        response_payload = {
            "games": payload,
            "synced": result["synced"],
            "achievement_games": result["achievement_games"],
            "warnings": result["warnings"],
            "playtime_available": False,
        }

        cache.delete(f"epic_stored_{request.user.id}")
        cache.delete(f"epic_achievements_{request.user.id}")
        logger.info(
            "Epic manual sync complete for user %s in %.1fs: %d games, "
            "%d with achievements, %d warnings",
            request.user.pk,
            time.monotonic() - started,
            result["synced"],
            result["achievement_games"],
            len(result["warnings"]),
        )
        return Response({"result": response_payload})

    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request: Request) -> Response:
        """Return stored Epic games ordered by acquisition, then name."""
        cache_key = f"epic_stored_{request.user.id}"
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return Response({"result": cached_result})

        games = (
            self.get_queryset()
            .select_related("user")
            .prefetch_related("achievements")
            .order_by(F("acquired_at").desc(nulls_last=True), "name")
        )
        serializer = EpicSerializer(games, many=True)
        cache.set(
            cache_key,
            serializer.data,
            getattr(settings, "CACHE_TIMEOUTS", {}).get("EPIC_GAMES", 900),
        )
        return Response({"result": serializer.data})

    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request: Request) -> Response:
        """Return stored Epic games ordered by achievement completion."""
        cache_key = f"epic_achievements_{request.user.id}"
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return Response({"result": cached_result})

        games = (
            self.get_queryset()
            .select_related("user")
            .prefetch_related("achievements")
            .annotate(
                total=Count("achievements"),
                unlocked=Count("achievements", filter=Q(achievements__unlocked=True)),
            )
        )
        ordered = sorted(
            games,
            key=lambda game: (
                (game.unlocked / game.total * 100) if game.total else 0  # pyright: ignore[reportAttributeAccessIssue]
            ),
            reverse=True,
        )
        serializer = EpicSerializer(ordered, many=True)
        cache.set(cache_key, serializer.data, 900)
        return Response({"result": serializer.data})
