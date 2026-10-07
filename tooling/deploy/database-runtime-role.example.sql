-- REVIEW ONLY: not a migration, not run by env setup or project generation.
-- Use a dedicated service database where possible. The current migration uses public tables.
-- On a shared Supabase database, first confirm these three tables belong ONLY to this service.
-- Existing table-name collisions need deliberate schema/model/migration changes, not search_path.
-- Apply as the migration owner AFTER migrations. Replace starter_runtime with a unique role.
-- Provision its password out of band (e.g. psql \password); never put it in SQL/Git.
-- DATABASE_URL uses this runtime role. DATABASE_MIGRATION_URL uses a separate table owner.
-- RLS here restricts DATABASE ROLES; per-user ownership remains checked by the NestJS API.
-- Audit existing policies/role memberships and existing service_role access separately.
BEGIN;
CREATE ROLE starter_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO starter_runtime', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO starter_runtime;

-- Do not silently inherit schema creation from PUBLIC on older PostgreSQL databases.
DO $$
BEGIN
  IF has_schema_privilege('starter_runtime', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Runtime role inherits public schema CREATE. Review dedicated database schema privileges first.';
  END IF;
END $$;

GRANT SELECT, INSERT ON public.users TO starter_runtime;
GRANT SELECT, INSERT, UPDATE ON public.refresh_sessions TO starter_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO starter_runtime;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY starter_api_users ON public.users TO starter_runtime USING (true) WITH CHECK (true);
CREATE POLICY starter_api_refresh_sessions ON public.refresh_sessions TO starter_runtime USING (true) WITH CHECK (true);
CREATE POLICY starter_api_projects ON public.projects TO starter_runtime USING (true) WITH CHECK (true);

-- Scope revocations to these service tables; never revoke all privileges on public schema.
REVOKE ALL ON public.users, public.refresh_sessions, public.projects FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON public.users, public.refresh_sessions, public.projects FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
