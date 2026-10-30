from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [("users", "0004_userapikey_users_usera_user_id_62609b_idx_and_more")]

    operations = [
        migrations.CreateModel(
            name="SyncJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(max_length=32)),
                ("status", models.CharField(choices=[("queued", "Queued"), ("running", "Running"), ("succeeded", "Succeeded"), ("failed", "Failed")], default="queued", max_length=16)),
                ("scheduled_for", models.DateTimeField(default=django.utils.timezone.now)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("next_retry_at", models.DateTimeField(blank=True, null=True)),
                ("retry_count", models.PositiveSmallIntegerField(default=0)),
                ("summary", models.JSONField(blank=True, default=dict)),
                ("error", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sync_jobs", to="auth.user")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["status", "scheduled_for"], name="users_syncj_status_e46fd5_idx"),
                    models.Index(fields=["user", "provider", "finished_at"], name="users_syncj_user_id_60da29_idx"),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name="syncjob",
            constraint=models.UniqueConstraint(condition=models.Q(status__in=["queued", "running"]), fields=("user", "provider"), name="one_active_sync_per_user_provider"),
        ),
    ]
