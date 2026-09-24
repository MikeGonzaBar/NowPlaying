"""Revoke the explicit ``public`` schema USAGE grants from anon/authenticated.

Companion to ``analytics/0004_lock_down_public_schema``: that migration enabled
RLS and removed the table grants, and this one drops the two roles' *explicit*
``USAGE`` on the schema.

Residual access (why this is not the whole story): Supabase's ``public`` schema
ACL also carries a ``PUBLIC`` (``=U``) USAGE grant, and ``anon`` /
``authenticated`` inherit from ``PUBLIC``.  ``has_schema_privilege('anon',
'public', 'usage')`` therefore still reports true after this migration.  That is
cosmetic rather than a data exposure: with no table privileges and RLS enabled,
PostgREST can only answer ``401`` for these tables, which is what was verified
after 0004.  To close the remaining gap at the routing layer, remove ``public``
from the project's exposed schemas in the dashboard
(Project Settings -> API); there is no SQL equivalent.

Django is unaffected (``postgres`` owns the schema and keeps an explicit USAGE
grant), as is the ``service_role`` secret key (explicit USAGE grant), so
revoking the ``PUBLIC`` grant later stays safe if you ever want to.

No-op on any Postgres without the Supabase roles (for example a plain CI
database), and reversible.
"""

from django.db import migrations

_REVOKE = """
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE USAGE ON SCHEMA public FROM anon, authenticated';
    ELSE
        RAISE NOTICE 'Skipping schema USAGE revoke: anon/authenticated roles are absent.';
    END IF;
END $$;
"""

_RESTORE = """
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA public TO anon, authenticated';
    ELSE
        RAISE NOTICE 'Skipping schema USAGE restore: anon/authenticated roles are absent.';
    END IF;
END $$;
"""


class Migration(migrations.Migration):
    """Close the remaining PostgREST surface for the anon/authenticated roles."""

    dependencies = [
        ("analytics", "0004_lock_down_public_schema"),
    ]

    operations = [
        migrations.RunSQL(sql=_REVOKE, reverse_sql=_RESTORE),
    ]
