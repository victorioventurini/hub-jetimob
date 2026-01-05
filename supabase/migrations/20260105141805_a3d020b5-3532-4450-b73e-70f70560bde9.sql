-- ============================================
-- Bu Locations (Sedes) - Complete Setup
-- ============================================

-- 1. Create ENUM types
CREATE TYPE public.bu_location_type AS ENUM (
  'headquarters',
  'office', 
  'warehouse',
  'remote_hub',
  'other'
);

CREATE TYPE public.bu_location_status AS ENUM (
  'active',
  'inactive'
);

-- 2. Create bu_locations table
CREATE TABLE public.bu_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  
  -- Basic info
  name text NOT NULL,
  type public.bu_location_type NOT NULL DEFAULT 'office',
  status public.bu_location_status NOT NULL DEFAULT 'active',
  is_default boolean NOT NULL DEFAULT false,
  
  -- Address fields (filled via Google Maps)
  formatted_address text,
  address_line_1 text,
  address_line_2 text,
  district text,
  city text,
  state text,
  country text DEFAULT 'BR',
  postal_code text,
  
  -- Geo / Google
  latitude numeric,
  longitude numeric,
  google_place_id text,
  timezone text DEFAULT 'America/Sao_Paulo',
  
  -- Meta
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz
);

-- 3. Create indexes
CREATE INDEX idx_bu_locations_bu_status ON public.bu_locations(bu_id, status);
CREATE INDEX idx_bu_locations_deleted_at ON public.bu_locations(deleted_at);

-- Partial unique index: only one default per BU (where not soft deleted)
CREATE UNIQUE INDEX idx_bu_locations_unique_default 
  ON public.bu_locations(bu_id) 
  WHERE is_default = true AND deleted_at IS NULL;

-- 4. Enable RLS
ALTER TABLE public.bu_locations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- SELECT: Users can view locations of BUs they have access to
CREATE POLICY "Users can view locations of their BUs"
ON public.bu_locations
FOR SELECT
USING (
  deleted_at IS NULL 
  AND (user_has_bu_access(auth.uid(), bu_id) OR is_platform_admin(auth.uid()))
);

-- INSERT: Only BU admins or platform admins
CREATE POLICY "BU admins can create locations"
ON public.bu_locations
FOR INSERT
WITH CHECK (
  is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid())
);

-- UPDATE: Only BU admins or platform admins
CREATE POLICY "BU admins can update locations"
ON public.bu_locations
FOR UPDATE
USING (
  is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid())
);

-- DELETE: Only platform admins (hard delete - not used, prefer soft delete)
CREATE POLICY "Platform admins can delete locations"
ON public.bu_locations
FOR DELETE
USING (
  is_platform_admin(auth.uid())
);

-- 6. Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION public.trg_bu_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bu_locations_updated_at
  BEFORE UPDATE ON public.bu_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_bu_locations_updated_at();

-- 7. Trigger: Ensure only one default per BU
-- When setting is_default=true, unset all other defaults for the same BU
CREATE OR REPLACE FUNCTION public.trg_bu_locations_ensure_single_default()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when setting is_default to true
  IF NEW.is_default = true AND (OLD IS NULL OR OLD.is_default = false) THEN
    -- Unset other defaults for the same BU
    UPDATE public.bu_locations
    SET is_default = false, updated_at = now()
    WHERE bu_id = NEW.bu_id
      AND id != NEW.id
      AND is_default = true
      AND deleted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bu_locations_ensure_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.bu_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_bu_locations_ensure_single_default();

-- 8. Trigger: Audit log for location changes
CREATE OR REPLACE FUNCTION public.trg_bu_locations_audit()
RETURNS TRIGGER AS $$
DECLARE
  action_type text;
  old_values jsonb;
  new_values jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
    old_values := NULL;
    new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if this is a soft delete
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      action_type := 'soft_delete';
    -- Check if this is setting default
    ELSIF NEW.is_default = true AND OLD.is_default = false THEN
      action_type := 'set_default';
    ELSE
      action_type := 'update';
    END IF;
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    'bu_location',
    COALESCE(NEW.id, OLD.id),
    action_type,
    old_values,
    new_values
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER bu_locations_audit
  AFTER INSERT OR UPDATE ON public.bu_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_bu_locations_audit();

-- 9. Add comments for documentation
COMMENT ON TABLE public.bu_locations IS 'Physical locations/headquarters for each Business Unit';
COMMENT ON COLUMN public.bu_locations.google_place_id IS 'Google Places ID for reference and future updates';
COMMENT ON COLUMN public.bu_locations.is_default IS 'Only one default location per BU is allowed';