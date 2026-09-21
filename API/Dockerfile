# Base image (pinned for reproducibility to a specific Alpine release)
FROM python:3.13-alpine3.24

# Install system dependencies including PostgreSQL development libraries for psycopg2
# libuuid is pinned to the patched util-linux build so the 7 high-severity
# CVE-2026-53612/53613/53614 (etc.) findings are fixed even if the base layer is cached.
RUN apk update && apk upgrade && apk add --no-cache \
    libxml2>=2.13.4-r6 \
    libuuid>=2.42.3-r1 \
    postgresql-dev \
    gcc \
    musl-dev \
    libffi-dev \
    && rm -rf /var/cache/apk/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --no-compile -r requirements.txt

COPY . .

ENV DJANGO_SETTINGS_MODULE=NowPlayingAPI.settings

EXPOSE 8080

CMD ["sh", "-c", "cd NowPlayingAPI && if [ \"${RUN_COLLECTSTATIC:-true}\" = \"true\" ]; then python manage.py collectstatic --noinput; fi && if [ \"${RUN_MIGRATIONS:-false}\" = \"true\" ]; then python manage.py migrate --noinput; fi && gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 2 --worker-class sync --worker-connections 1000 --timeout 600 --keep-alive 5 --max-requests 1000 --max-requests-jitter 100 --preload --log-level info NowPlayingAPI.wsgi:application"]
