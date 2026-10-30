from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0005_syncjob")]

    operations = [
        migrations.AddField(
            model_name="userapikey",
            name="sync_enabled",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="userapikey",
            name="sync_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="userapikey",
            name="sync_timezone",
            field=models.CharField(default="UTC", max_length=64),
        ),
    ]
