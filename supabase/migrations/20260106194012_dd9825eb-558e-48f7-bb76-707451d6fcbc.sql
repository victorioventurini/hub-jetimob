-- =====================================================
-- ASSET CODE NORMALIZATION & RESOLUTION FUNCTIONS
-- Standardizes internal_code handling across the Hub
-- =====================================================

-- 1) Normalize asset code: remove non-digits, pad to 4 chars
CREATE OR REPLACE FUNCTION public.normalize_asset_code(code_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  clean_code text;
BEGIN
  -- Remove all non-numeric characters
  clean_code := regexp_replace(code_text, '[^0-9]', '', 'g');
  
  -- Return NULL if empty
  IF clean_code = '' OR clean_code IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Left-pad to 4 digits
  RETURN lpad(clean_code, 4, '0');
END;
$$;

-- 2) Resolve asset by code within a specific BU
CREATE OR REPLACE FUNCTION public.resolve_asset_by_code_for_bu(
  p_bu_id uuid,
  code_text text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_code text;
  asset_id uuid;
BEGIN
  normalized_code := normalize_asset_code(code_text);
  
  IF normalized_code IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO asset_id
  FROM public.asset_inventory
  WHERE bu_id = p_bu_id
    AND internal_code = normalized_code
    AND deleted_at IS NULL
  LIMIT 1;
  
  RETURN asset_id;
END;
$$;

-- 3) Resolve asset globally (for public routes) - returns asset_id and bu_id
-- SECURITY DEFINER to bypass RLS for public access
CREATE OR REPLACE FUNCTION public.resolve_asset_by_code_global(code_text text)
RETURNS TABLE(asset_id uuid, bu_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_code text;
BEGIN
  normalized_code := normalize_asset_code(code_text);
  
  IF normalized_code IS NULL THEN
    RETURN;
  END IF;
  
  -- Return only from active BUs
  RETURN QUERY
  SELECT ai.id, ai.bu_id
  FROM public.asset_inventory ai
  JOIN public.bu_units bu ON bu.id = ai.bu_id
  WHERE ai.internal_code = normalized_code
    AND ai.deleted_at IS NULL
    AND bu.status = 'active'
  LIMIT 1;
END;
$$;

-- 4) Ensure unique index exists (partial index for soft-delete)
-- This is idempotent - will not fail if already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'asset_inventory' 
    AND indexname = 'idx_asset_inventory_bu_internal_code_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_asset_inventory_bu_internal_code_unique 
    ON public.asset_inventory (bu_id, internal_code) 
    WHERE deleted_at IS NULL;
  END IF;
END $$;