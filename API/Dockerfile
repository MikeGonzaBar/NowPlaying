# Base image
FROM python:alpine

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DJANGO_SETTINGS_MODULE=NowPlayingAPI.settings

EXPOSE 8080

CMD ["sh", "-c", "cd NowPlayingAPI && gunicorn --bind 0.0.0.0:$PORT --workers 2  --timeout 120 --log-level info NowPlayingAPI.wsgi:application"]


