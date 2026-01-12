-- ============================================================
-- P3.1: Move 'unaccent' extension from public to extensions schema
-- ============================================================
-- This improves security by isolating extensions in a dedicated schema.
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

-- 1. Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Grant usage to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;

-- 3. Move the extension (drop and recreate in correct schema)
DROP EXTENSION IF EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- 4. Add comment for documentation
COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents - moved to extensions schema for security';