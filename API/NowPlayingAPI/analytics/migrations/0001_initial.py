# Generated by Django 5.1.8 on 2025-06-30 01:43

import datetime
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AchievementProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game_platform', models.CharField(max_length=50)),
                ('game_appid', models.CharField(max_length=100)),
                ('game_name', models.CharField(max_length=255)),
                ('total_achievements', models.IntegerField(default=0)),
                ('unlocked_achievements', models.IntegerField(default=0)),
                ('completion_percentage', models.DecimalField(decimal_places=2, default=0.0, max_digits=5)),
                ('last_updated', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='achievement_progress', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['user', '-completion_percentage'], name='analytics_a_user_id_e0054b_idx')],
                'unique_together': {('user', 'game_platform', 'game_appid')},
            },
        ),
        migrations.CreateModel(
            name='GamingStreak',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('streak_length', models.IntegerField()),
                ('total_gaming_time', models.DurationField(default=datetime.timedelta(0))),
                ('games_played', models.IntegerField(default=0)),
                ('achievements_earned', models.IntegerField(default=0)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gaming_streaks', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['user', '-streak_length'], name='analytics_g_user_id_041d08_idx')],
            },
        ),
        migrations.CreateModel(
            name='GenreStatistics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('genre', models.CharField(max_length=100)),
                ('content_type', models.CharField(max_length=20)),
                ('date', models.DateField()),
                ('time_spent', models.DurationField(default=datetime.timedelta(0))),
                ('items_count', models.IntegerField(default=0)),
                ('completion_rate', models.DecimalField(decimal_places=2, default=0.0, max_digits=5)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='genre_stats', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['user', 'content_type', 'date'], name='analytics_g_user_id_f82d24_idx')],
                'unique_together': {('user', 'genre', 'content_type', 'date')},
            },
        ),
        migrations.CreateModel(
            name='ListeningSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('platform', models.CharField(max_length=20)),
                ('start_time', models.DateTimeField()),
                ('end_time', models.DateTimeField()),
                ('duration', models.DurationField()),
                ('songs_count', models.IntegerField(default=0)),
                ('artists_count', models.IntegerField(default=0)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='listening_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['user', 'start_time'], name='analytics_l_user_id_0d1dfa_idx')],
            },
        ),
        migrations.CreateModel(
            name='PlatformStatistics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('platform', models.CharField(max_length=50)),
                ('date', models.DateField()),
                ('time_spent', models.DurationField(default=datetime.timedelta(0))),
                ('items_count', models.IntegerField(default=0)),
                ('achievements_count', models.IntegerField(default=0)),
                ('completion_rate', models.DecimalField(decimal_places=2, default=0.0, max_digits=5)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='platform_stats', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['user', 'platform', 'date'], name='analytics_p_user_id_58f227_idx')],
                'unique_together': {('user', 'platform', 'date')},
            },
        ),
        migrations.CreateModel(
            name='UserStatistics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('games_played', models.IntegerField(default=0)),
                ('games_completed', models.IntegerField(default=0)),
                ('total_gaming_time', models.DurationField(default=datetime.timedelta(0))),
                ('achievements_earned', models.IntegerField(default=0)),
                ('gaming_streak_days', models.IntegerField(default=0)),
                ('songs_listened', models.IntegerField(default=0)),
                ('total_listening_time', models.DurationField(default=datetime.timedelta(0))),
                ('unique_artists', models.IntegerField(default=0)),
                ('unique_albums', models.IntegerField(default=0)),
                ('movies_watched', models.IntegerField(default=0)),
                ('episodes_watched', models.IntegerField(default=0)),
                ('total_watch_time', models.DurationField(default=datetime.timedelta(0))),
                ('shows_started', models.IntegerField(default=0)),
                ('shows_completed', models.IntegerField(default=0)),
                ('total_engagement_time', models.DurationField(default=datetime.timedelta(0))),
                ('active_platforms', models.IntegerField(default=0)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='statistics', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['user', 'date'], name='analytics_u_user_id_196125_idx'), models.Index(fields=['date'], name='analytics_u_date_285bfd_idx')],
                'unique_together': {('user', 'date')},
            },
        ),
        migrations.CreateModel(
            name='WatchSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('platform', models.CharField(max_length=20)),
                ('content_type', models.CharField(max_length=20)),
                ('content_title', models.CharField(max_length=255)),
                ('start_time', models.DateTimeField()),
                ('end_time', models.DateTimeField()),
                ('duration', models.DurationField()),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='watch_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['user', 'start_time'], name='analytics_w_user_id_3dac50_idx')],
            },
        ),
    ]
