from dataclasses import dataclass

from rest_framework import status
from rest_framework.exceptions import APIException, NotAuthenticated

from .models import UserApiKey


SERVICE_LABELS = {
    "lastfm": "Last.fm",
    "psn": "PlayStation",
    "retroachievements": "RetroAchievements",
    "spotify": "Spotify",
    "steam": "Steam",
    "trakt": "Trakt",
    "xbox": "Xbox",
}


class MissingServiceCredentials(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "missing_service_credentials"


class InvalidServiceCredentials(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_service_credentials"


@dataclass(frozen=True)
class ServiceCredentials:
    service_name: str
    api_key: str
    service_user_id: str | None = None


def get_service_credentials(user, service_name, *, require_user_id=False) -> ServiceCredentials:
    if not user or not user.is_authenticated:
        raise NotAuthenticated("Authentication required to access service credentials.")

    label = SERVICE_LABELS.get(service_name, service_name)

    try:
        api_key_obj = UserApiKey.objects.get(user=user, service_name=service_name)
    except UserApiKey.DoesNotExist as exc:
        raise MissingServiceCredentials(
            f"No {label} API key found. Please add it in profile settings."
        ) from exc

    api_key = api_key_obj.get_key()
    if not api_key:
        raise InvalidServiceCredentials(
            f"Could not decrypt the stored {label} API key. Please save it again."
        )

    if require_user_id and not api_key_obj.service_user_id:
        raise MissingServiceCredentials(
            f"No {label} user ID found. Please update the {label} API key with its user ID."
        )

    api_key_obj.update_last_used()
    return ServiceCredentials(
        service_name=service_name,
        api_key=api_key,
        service_user_id=api_key_obj.service_user_id,
    )

