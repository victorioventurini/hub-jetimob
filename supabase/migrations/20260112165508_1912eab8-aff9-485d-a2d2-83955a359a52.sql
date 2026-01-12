-- ============================================================
-- FIX f_unaccent function to use correct schema for unaccent extension
-- The unaccent extension is installed in 'extensions' schema, not 'public'
-- ============================================================

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path TO 'public', 'extensions'
AS $$
  SELECT extensions.unaccent($1)
$$;

COMMENT ON FUNCTION public.f_unaccent(text) IS 
  'Wrapper for unaccent that uses the extensions schema where the extension is installed';