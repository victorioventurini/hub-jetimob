-- Fix linter ERROR 0010_security_definer_view
-- Set all public views to security_invoker = true to ensure RLS/permissions are evaluated for the querying user.

DO $do$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS view_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND (c.reloptions IS NULL OR NOT (c.reloptions @> ARRAY['security_invoker=on']))
  LOOP
    EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true);', r.schema_name, r.view_name);
  END LOOP;
END;
$do$;