CREATE OR REPLACE FUNCTION public.enforce_bu_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_bu uuid;
BEGIN
  -- Service-role / internal maintenance context (no authenticated user):
  -- allow when bu_id is already set; still block when it is missing.
  IF auth.uid() IS NULL THEN
    IF NEW.bu_id IS NULL THEN
      RAISE EXCEPTION 'MISSING_BU_ID: Cannot insert/update without bu_id and no BU context available';
    END IF;
    RETURN NEW;
  END IF;

  IF is_platform_admin(auth.uid()) THEN
    IF NEW.bu_id IS NULL THEN
      NEW.bu_id := current_bu_id();
    END IF;
    RETURN NEW;
  END IF;

  v_current_bu := current_bu_id();

  IF NEW.bu_id IS NULL THEN
    IF v_current_bu IS NULL THEN
      RAISE EXCEPTION 'MISSING_BU_ID: Cannot insert/update without bu_id and no BU context available';
    END IF;
    NEW.bu_id := v_current_bu;
  ELSE
    IF v_current_bu IS NOT NULL AND NEW.bu_id != v_current_bu THEN
      RAISE EXCEPTION 'BU_SCOPE_VIOLATION: Cannot operate on data from a different BU';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;