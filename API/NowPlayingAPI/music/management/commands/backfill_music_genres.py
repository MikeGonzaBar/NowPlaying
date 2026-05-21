from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from music.models import Song
from music.views import invalidate_music_caches
from users.credentials import get_service_credentials


class Command(BaseCommand):
    help = "Backfill music genre tags from Last.fm artist top-tags."

    def add_arguments(self, parser):
        parser.add_argument("--user-id", type=int, help="Only backfill one user.")
        parser.add_argument("--days", type=int, default=365, help="Only inspect songs played in this many days.")
        parser.add_argument(
            "--artist-limit",
            type=int,
            default=500,
            help="Maximum unique artists to look up per user.",
        )
        parser.add_argument("--dry-run", action="store_true", help="Fetch tags but do not save them.")

    def handle(self, *args, **options):
        user_id = options.get("user_id")
        days = options["days"]
        artist_limit = options["artist_limit"]
        dry_run = options["dry_run"]

        if days < 1:
            self.stderr.write(self.style.ERROR("--days must be at least 1."))
            return
        if artist_limit < 1:
            self.stderr.write(self.style.ERROR("--artist-limit must be at least 1."))
            return

        users = get_user_model().objects.all()
        if user_id:
            users = users.filter(id=user_id)

        since = timezone.now() - timedelta(days=days)
        total_updated = 0
        total_artists_tagged = 0

        for user in users:
            try:
                credentials = get_service_credentials(user, "lastfm")
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f"Skipping user {user.id}: {exc}"))
                continue

            artist_rows = {}
            songs = (
                Song.objects.filter(user=user, played_at__gte=since)
                .exclude(artist="")
                .order_by("-played_at")
                .values("artist", "artist_mbid")
            )
            for row in songs:
                cache_key = (row.get("artist_mbid") or row["artist"]).strip().lower()
                if not cache_key or cache_key in artist_rows:
                    continue
                artist_rows[cache_key] = row
                if len(artist_rows) >= artist_limit:
                    break

            user_updated = 0
            user_artists_tagged = 0
            for row in artist_rows.values():
                artist = row["artist"]
                artist_mbid = row.get("artist_mbid") or ""
                tags = Song.fetch_lastfm_artist_tags(
                    credentials.api_key,
                    artist,
                    artist_mbid=artist_mbid,
                )
                if not tags:
                    continue

                user_artists_tagged += 1
                matching_songs = Song.objects.filter(user=user, artist=artist, played_at__gte=since)
                updated_count = matching_songs.count()
                if not dry_run:
                    matching_songs.update(genre_tags=tags)
                user_updated += updated_count

            if not dry_run and user_updated:
                invalidate_music_caches(user.id)

            total_updated += user_updated
            total_artists_tagged += user_artists_tagged
            self.stdout.write(
                self.style.SUCCESS(
                    f"User {user.id}: tagged {user_updated} songs from {user_artists_tagged} artists."
                )
            )

        mode = "Would update" if dry_run else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode} {total_updated} songs from {total_artists_tagged} artists."
            )
        )
