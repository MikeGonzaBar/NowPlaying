# Generated by Django 5.1.8 on 2025-05-28 02:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('music', '0002_remove_song_unique_song_song_user_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='song',
            name='source',
            field=models.CharField(choices=[('spotify', 'Spotify'), ('lastfm', 'Last.fm')], default='spotify', max_length=20),
        ),
    ]
