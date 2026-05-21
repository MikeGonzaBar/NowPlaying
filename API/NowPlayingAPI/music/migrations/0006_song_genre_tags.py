from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0005_alter_song_url_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="song",
            name="genre_tags",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Normalized Last.fm genre tags for analytics",
            ),
        ),
    ]
