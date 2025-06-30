from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from analytics.models import UserStatistics
from analytics.services import AnalyticsService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fix analytics by clearing existing UserStatistics and recalculating'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Username to fix analytics for (default: all users)',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to recalculate (default: 30)',
        )

    def handle(self, *args, **options):
        username = options['user']
        days = options['days']
        
        if username:
            try:
                users = [User.objects.get(username=username)]
                self.stdout.write(f"Fixing analytics for user: {username}")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"User '{username}' not found"))
                return
        else:
            users = User.objects.all()
            self.stdout.write(f"Fixing analytics for {users.count()} users")
        
        for user in users:
            self.stdout.write(f"\n--- Processing user: {user.username} ---")
            
            # Delete existing UserStatistics for this user
            deleted_count = UserStatistics.objects.filter(user=user).count()
            UserStatistics.objects.filter(user=user).delete()
            self.stdout.write(f"Deleted {deleted_count} existing UserStatistics records")
            
            # Trigger recalculation
            try:
                result = AnalyticsService.get_comprehensive_statistics(user, days=days)
                totals = result['totals']
                
                self.stdout.write(self.style.SUCCESS(
                    f"✅ Fixed analytics for {user.username}:\n"
                    f"   Movies: {totals['total_movies_watched']}\n"
                    f"   Episodes: {totals['total_episodes_watched']}\n"
                    f"   Games: {totals['total_games_played']}\n"
                    f"   Songs: {totals['total_songs_listened']}"
                ))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Failed to fix analytics for {user.username}: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS("\n🎉 Analytics fix completed!")) 