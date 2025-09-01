from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from music.models import Song
from steam.models import Game, Achievement
from playstation.models import PSNGame, PSNAchievement
from xbox.models import XboxGame, XboxAchievement
from retroachievements.models import RetroAchievementsGame, GameAchievement
from trakt.models import MovieWatch, EpisodeWatch
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Identify and fix naive datetime objects in the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Actually fix the naive datetime objects (default is dry-run)',
        )

    def handle(self, *args, **options):
        fix_mode = options['fix']
        
        if not fix_mode:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made. Use --fix to apply changes.')
            )
        
        # Define models and their datetime fields
        model_fields = [
            (Song, ['played_at']),
            (Game, ['last_played']),
            (Achievement, ['unlock_time']),
            (PSNGame, ['first_played', 'last_played']),
            (PSNAchievement, ['unlock_time']),
            (XboxGame, ['first_played', 'last_played']),
            (XboxAchievement, ['unlock_time']),
            (RetroAchievementsGame, ['last_played']),
            (GameAchievement, ['date_created', 'date_modified', 'date_earned']),
            (MovieWatch, ['watched_at']),
            (EpisodeWatch, ['watched_at']),
        ]
        
        total_fixed = 0
        
        for model, fields in model_fields:
            self.stdout.write(f'\nChecking {model.__name__}...')
            
            for field_name in fields:
                try:
                    # Get all objects with non-null datetime values
                    filter_kwargs = {f'{field_name}__isnull': False}
                    objects = model.objects.filter(**filter_kwargs)
                    
                    naive_count = 0
                    fixed_count = 0
                    
                    for obj in objects:
                        field_value = getattr(obj, field_name)
                        if field_value and not timezone.is_aware(field_value):
                            naive_count += 1
                            
                            if fix_mode:
                                # Make the datetime timezone-aware
                                aware_datetime = timezone.make_aware(field_value)
                                setattr(obj, field_name, aware_datetime)
                                obj.save(update_fields=[field_name])
                                fixed_count += 1
                    
                    if naive_count > 0:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  {field_name}: {naive_count} naive datetimes found'
                                + (f', {fixed_count} fixed' if fix_mode else '')
                            )
                        )
                        total_fixed += fixed_count
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(f'  {field_name}: All datetimes are timezone-aware')
                        )
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  Error checking {field_name}: {e}')
                    )
        
        if fix_mode:
            self.stdout.write(
                self.style.SUCCESS(f'\nTotal naive datetimes fixed: {total_fixed}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'\nRun with --fix to apply these changes')
            ) 