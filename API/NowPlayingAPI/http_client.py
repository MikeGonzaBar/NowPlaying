import logging
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = (5, 30)
RETRY_STATUSES = {429, 500, 502, 503, 504}
RequestTimeout = float | tuple[float, float]


class ExternalRequestError(Exception):
    """Raised when an outbound HTTP request fails or returns invalid content."""

    pass


def request(
    method: str,
    url: str,
    *,
    retries: int = 2,
    timeout: RequestTimeout = DEFAULT_TIMEOUT,
    logger_name: str | None = None,
    **kwargs: Any,
) -> requests.Response:
    """Run an HTTP request with retry handling for transient failures."""
    log = logging.getLogger(logger_name) if logger_name else logger

    for attempt in range(retries + 1):
        try:
            response = requests.request(method, url, timeout=timeout, **kwargs)
        except requests.RequestException as exc:
            if attempt >= retries:
                log.warning("External request failed: %s %s (%s)", method.upper(), url, exc)
                raise ExternalRequestError("External service request failed.") from exc
            time.sleep(2**attempt)
            continue

        if response.status_code not in RETRY_STATUSES or attempt >= retries:
            return response

        log.info(
            "Retrying external request after status %s: %s %s",
            response.status_code,
            method.upper(),
            url,
        )
        time.sleep(2**attempt)

    raise ExternalRequestError("External service request failed.")


def get(url: str, **kwargs: Any) -> requests.Response:
    """Send a GET request through the shared retry wrapper."""
    return request("get", url, **kwargs)


def post(url: str, **kwargs: Any) -> requests.Response:
    """Send a POST request through the shared retry wrapper."""
    return request("post", url, **kwargs)
