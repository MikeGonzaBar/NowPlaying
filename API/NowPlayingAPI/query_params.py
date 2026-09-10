from collections.abc import Mapping

from rest_framework.exceptions import ValidationError


def bounded_int(
    query_params: Mapping[str, object],
    name: str,
    *,
    default: int,
    minimum: int = 1,
    maximum: int | None = None,
) -> int:
    """Return an integer query parameter constrained to the provided bounds."""
    raw_value = query_params.get(name, default)
    try:
        value = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({name: f"Must be an integer."}) from exc

    if value < minimum:
        raise ValidationError({name: f"Must be at least {minimum}."})

    if maximum is not None and value > maximum:
        return maximum

    return value


def pagination_params(
    query_params: Mapping[str, object],
    *,
    default_page_size: int = 25,
    max_page_size: int = 100,
) -> tuple[int, int]:
    """Return page and page-size query parameters with shared validation."""
    page = bounded_int(query_params, "page", default=1, minimum=1)
    page_size = bounded_int(
        query_params,
        "page_size",
        default=default_page_size,
        minimum=1,
        maximum=max_page_size,
    )
    return page, page_size
