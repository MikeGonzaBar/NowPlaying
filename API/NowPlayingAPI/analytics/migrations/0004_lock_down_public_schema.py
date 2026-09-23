"""Lock down the Supabase ``public`` schema so only Django can reach app data.

Supabase exposes PostgREST over the ``public`` schema, and its default
privileges grant the ``anon`` and ``authenticated`` roles full privileges on
every table there.  Django creates its tables in ``public`` with Row Level
Security disabled, so those roles could read *and* write every app table --
including ``auth_user`` (password hashes), ``django_session`` (live session
keys), ``users_userapikey`` and ``trakt_trakttoken`` -- using only the
publishable key, which is designed to be public.

This migration closes that hole:

1. enables ROW LEVEL SECURITY on every table in ``public``.  No policies are
   created, so ``anon``/``authenticated`` see zero rows while the table owner
   (and the ``service_role`` key, if ever needed) still sees everything;
2. revokes the inherited grants from ``anon``/``authenticated``;
3. removes those default privileges so *future* tables created by Django are
   not re-exposed automatically.

Django is unaffected: it connects as the ``postgres`` role, which has
``BYPASSRLS`` set.

The migration is a deliberate no-op on any Postgres that lacks the Supabase
``anon``/``authenticated`` roles (a plain CI database), so it never risks
locking an application out of its own tables.
"""

from django.db import migrations

_LOCK_DOWN = """
DO $$
DECLARE
    r record;
    is_supabase boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
      INTO is_supabase;

    IF NOT is_supabase THEN
        RAISE NOTICE 'Skipping RLS lockdown: anon/authenticated roles are absent.';
        RETURN;
    END IF;

    FOR r IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relkind = 'r'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', r.relname);
    END LOOP;

    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public '
            'REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public '
            'REVOKE ALL ON SEQUENCES FROM anon, authenticated';
END $$;
"""

_RESTORE = """
DO $$
DECLARE
    r record;
    is_supabase boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
      INTO is_supabase;

    IF NOT is_supabase THEN
        RAISE NOTICE 'Skipping RLS restore: anon/authenticated roles are absent.';
        RETURN;
    END IF;

    FOR r IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relkind = 'r'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.relname);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated', r.relname);
    END LOOP;

    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public '
            'GRANT ALL ON TABLES TO anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public '
            'GRANT ALL ON SEQUENCES TO anon, authenticated';
END $$;
"""


class Migration(migrations.Migration):
    """Enable RLS and drop anon/authenticated grants on the public schema."""

    dependencies = [
        ("analytics", "0003_db_level_cascades"),
    ]

    operations = [
        migrations.RunSQL(sql=_LOCK_DOWN, reverse_sql=_RESTORE),
    ]
