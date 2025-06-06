# Generated by Django 5.1.8 on 2025-05-28 02:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('music', '0003_song_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='song',
            name='album_mbid',
            field=models.CharField(blank=True, help_text='MusicBrainz album ID', max_length=36, null=True),
        ),
        migrations.AddField(
            model_name='song',
            name='album_thumbnail_extralarge',
            field=models.URLField(blank=True, help_text='Album art 300x300px', null=True),
        ),
        migrations.AddField(
            model_name='song',
            name='album_thumbnail_large',
            field=models.URLField(blank=True, help_text='Album art 174x174px', null=True),
        ),
        migrations.AddField(
            model_name='song',
            name='album_thumbnail_medium',
            field=models.URLField(blank=True, help_text='Album art 64x64px', null=True),
        ),
        migrations.AddField(
            model_name='song',
            name='album_thumbnail_small',
            field=models.URLField(blank=True, help_text='Album art 34x34px', null=True),
        ),
        migrations.AddField(
            model_name='song',
            name='artist_lastfm_url',
            field=models.URLField(blank=True, help_text="Artist's Last.fm page URL", null=True),
        ),
        migrations.AddField(
            model_name='song',
            name='artist_mbid',
            field=models.CharField(blank=True, help_text='MusicBrainz artist ID', max_length=36, null=True),
        ),
        migrations.AddField(
            model_name='song',
            name='loved',
            field=models.BooleanField(default=False, help_text='Whether user has loved this track on Last.fm'),
        ),
        migrations.AddField(
            model_name='song',
            name='streamable',
            field=models.BooleanField(default=False, help_text='Whether track is streamable on Last.fm'),
        ),
        migrations.AddField(
            model_name='song',
            name='track_mbid',
            field=models.CharField(blank=True, help_text='MusicBrainz track ID', max_length=36, null=True),
        ),
    ]
