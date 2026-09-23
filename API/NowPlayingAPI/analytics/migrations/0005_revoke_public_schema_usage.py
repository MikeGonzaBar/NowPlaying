"""Revoke ``public`` schema USAGE from the Supabase anon/authenticated roles.

Companion to ``analytics/0004_lock_down_public_schema``.  That migration enabled
RLS and removed the table grants, but the two roles still held ``USAGE`` on the
``public`` schema, which is what lets PostgREST reach the schema at all.
Removing USAGE is the SQL-level equivalent of dropping ``public`` from the
project's exposed schemas (Dashboard -> Project Settings -> API).

Django is unaffected: it connects as ``postgres``, which owns the schema.

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
