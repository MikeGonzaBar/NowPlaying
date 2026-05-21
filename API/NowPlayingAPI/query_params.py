from rest_framework.exceptions import ValidationError


def bounded_int(query_params, name, *, default, minimum=1, maximum=None):
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


def pagination_params(query_params, *, default_page_size=25, max_page_size=100):
    page = bounded_int(query_params, "page", default=1, minimum=1)
    page_size = bounded_int(
        query_params,
        "page_size",
        default=default_page_size,
        minimum=1,
        maximum=max_page_size,
    )
    return page, page_size

