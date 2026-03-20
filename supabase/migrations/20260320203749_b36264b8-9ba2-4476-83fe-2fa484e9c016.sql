
-- ============================================================
-- Audit trigger for asset_phone_lines
-- Reuses existing audit_logs table (entity_type = 'asset_phone_line')
-- Pattern matches profile/kpi_metric/team_membership triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_audit_asset_phone_lines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
    VALUES (auth.uid(), 'create', 'asset_phone_line', NEW.id, to_jsonb(NEW), now());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only log if something actually changed (ignore updated_at-only changes)
    IF to_jsonb(NEW) - 'updated_at' IS DISTINCT FROM to_jsonb(OLD) - 'updated_at' THEN
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, created_at)
      VALUES (auth.uid(), 'update', 'asset_phone_line', NEW.id, to_jsonb(OLD), to_jsonb(NEW), now());
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, created_at)
    VALUES (auth.uid(), 'delete', 'asset_phone_line', OLD.id, to_jsonb(OLD), now());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_audit_asset_phone_lines ON public.asset_phone_lines;
CREATE TRIGGER trg_audit_asset_phone_lines
  AFTER INSERT OR UPDATE OR DELETE ON public.asset_phone_lines
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_asset_phone_lines();
