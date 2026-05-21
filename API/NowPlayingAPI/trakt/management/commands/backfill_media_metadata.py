from django.core.management.base import BaseCommand

from analytics.services import AnalyticsService
from trakt.models import (
    Movie,
    Show,
    fetch_tmdb_movie_metadata,
    fetch_tmdb_show_metadata,
)


class Command(BaseCommand):
    help = "Backfill movie/show metadata used by analytics from TMDB."

    def add_arguments(self, parser):
        parser.add_argument("--user-id", type=int, default=None)
        parser.add_argument("--limit", type=int, default=200)

    def handle(self, *args, **options):
        user_id = options["user_id"]
        limit = options["limit"]

        movie_qs = Movie.objects.exclude(tmdb_id__isnull=True).exclude(tmdb_id="")
        show_qs = Show.objects.exclude(tmdb_id__isnull=True).exclude(tmdb_id="")
        if user_id:
            movie_qs = movie_qs.filter(user_id=user_id)
            show_qs = show_qs.filter(user_id=user_id)

        movies_updated = 0
        for movie in movie_qs.order_by("-last_watched_at")[:limit]:
            metadata = fetch_tmdb_movie_metadata(movie.tmdb_id)
            if not metadata:
                continue

            movie.genres = metadata.get("genres", movie.genres) or movie.genres
            movie.directors = metadata.get("directors", movie.directors) or movie.directors
            movie.studios = metadata.get("studios", movie.studios) or movie.studios
            movie.runtime = metadata.get("runtime") or movie.runtime
            movie.rating = metadata.get("rating") or movie.rating
            movie.image_url = movie.image_url or metadata.get("poster")
            movie.save(update_fields=["genres", "directors", "studios", "runtime", "rating", "image_url"])
            movies_updated += 1

        shows_updated = 0
        for show in show_qs.order_by("-last_watched_at")[:limit]:
            metadata = fetch_tmdb_show_metadata(show.tmdb_id)
            if not metadata:
                continue

            show.genres = metadata.get("genres", show.genres) or show.genres
            show.network = metadata.get("network") or show.network
            show.status = metadata.get("status") or show.status
            show.runtime = metadata.get("runtime") or show.runtime
            show.rating = metadata.get("rating") or show.rating
            show.image_url = show.image_url or metadata.get("poster")
            show.save(update_fields=["genres", "network", "status", "runtime", "rating", "image_url"])
            shows_updated += 1

        if user_id:
            AnalyticsService.invalidate_user_cache(user_id)

        self.stdout.write(
            self.style.SUCCESS(
                f"Backfilled metadata for {movies_updated} movies and {shows_updated} shows."
            )
        )
