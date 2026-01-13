# Base image
FROM python:alpine

# Install system dependencies including PostgreSQL development libraries for psycopg2
RUN apk update && apk upgrade && apk add --no-cache \
    libxml2>=2.13.4-r6 \
    postgresql-dev \
    gcc \
    musl-dev \
    libffi-dev \
    && rm -rf /var/cache/apk/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DJANGO_SETTINGS_MODULE=NowPlayingAPI.settings

EXPOSE 8080

CMD ["sh", "-c", "cd NowPlayingAPI && gunicorn --bind 0.0.0.0:$PORT --workers 2 --worker-class sync --worker-connections 1000 --timeout 600 --keep-alive 5 --max-requests 1000 --max-requests-jitter 100 --preload --log-level info NowPlayingAPI.wsgi:application"]
