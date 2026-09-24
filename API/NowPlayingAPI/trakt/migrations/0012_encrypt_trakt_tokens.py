"""Encrypt the stored Trakt OAuth tokens at rest.

``TraktToken.access_token`` / ``refresh_token`` were plain ``CharField``s, so
the tokens sat in the database in clear text.  They are now stored through
``users.crypto`` (Fernet with ``API_KEY_ENCRYPTION_KEY``) and reached from the
rest of the code through the ``access_token`` / ``refresh_token`` properties.

The data step is idempotent: a value that already looks like a Fernet token is
left untouched, so re-running it against a table written by the new code is safe.
"""

from django.db import migrations, models

# Fernet tokens are urlsafe-base64 of a payload that starts with version byte
# 0x80, which always encodes to this prefix.
FERNET_PREFIX = "gAAAAA"

_ENCRYPTED_FIELDS = ("access_token_encrypted", "refresh_token_encrypted")


def encrypt_existing_tokens(apps, schema_editor):
    """Encrypt any tokens still stored in plaintext."""
    from users.crypto import encrypt_api_key

    TraktToken = apps.get_model("trakt", "TraktToken")
    for token in TraktToken.objects.all():
        changed = False
        for field in _ENCRYPTED_FIELDS:
            value = getattr(token, field)
            if value and not value.startswith(FERNET_PREFIX):
                setattr(token, field, encrypt_api_key(value))
                changed = True
        if changed:
            token.save(update_fields=list(_ENCRYPTED_FIELDS))


def decrypt_existing_tokens(apps, schema_editor):
    """Reverse the encryption (best effort) so pre-migration code keeps working."""
    from users.crypto import decrypt_api_key

    TraktToken = apps.get_model("trakt", "TraktToken")
    for token in TraktToken.objects.all():
        changed = False
        for field in _ENCRYPTED_FIELDS:
            value = getattr(token, field)
            if value and value.startswith(FERNET_PREFIX):
                plaintext = decrypt_api_key(value)
                if plaintext:
                    setattr(token, field, plaintext)
                    changed = True
        if changed:
            token.save(update_fields=list(_ENCRYPTED_FIELDS))


class Migration(migrations.Migration):
    """Rename the token columns and encrypt their contents."""

    dependencies = [
        ("trakt", "0011_movie_show_analytics_metadata"),
    ]

    operations = [
        migrations.RenameField(
            model_name="trakttoken",
            old_name="access_token",
            new_name="access_token_encrypted",
        ),
        migrations.AlterField(
            model_name="trakttoken",
            name="access_token_encrypted",
            field=models.TextField(),
        ),
        migrations.RenameField(
            model_name="trakttoken",
            old_name="refresh_token",
            new_name="refresh_token_encrypted",
        ),
        migrations.AlterField(
            model_name="trakttoken",
            name="refresh_token_encrypted",
            field=models.TextField(),
        ),
        migrations.RunPython(encrypt_existing_tokens, decrypt_existing_tokens),
    ]
