# Generated by Django 5.1.6 on 2025-04-04 07:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trakt', '0007_show_last_watched_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='show',
            name='tmdb_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
