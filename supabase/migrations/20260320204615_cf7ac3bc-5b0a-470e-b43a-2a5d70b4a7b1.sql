
-- Audit trigger for asset_inventory
CREATE OR REPLACE FUNCTION public.fn_audit_asset_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (entity_type, entity_id, action, new_values, user_id)
    VALUES ('asset_inventory', NEW.id, 'create', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (entity_type, entity_id, action, old_values, new_values, user_id)
    VALUES ('asset_inventory', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (entity_type, entity_id, action, old_values, user_id)
    VALUES ('asset_inventory', OLD.id, 'delete', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_asset_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.asset_inventory
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_asset_inventory();

-- Audit trigger for asset_keyrings
CREATE OR REPLACE FUNCTION public.fn_audit_asset_keyrings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (entity_type, entity_id, action, new_values, user_id)
    VALUES ('asset_keyring', NEW.id, 'create', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (entity_type, entity_id, action, old_values, new_values, user_id)
    VALUES ('asset_keyring', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (entity_type, entity_id, action, old_values, user_id)
    VALUES ('asset_keyring', OLD.id, 'delete', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_asset_keyrings
  AFTER INSERT OR UPDATE OR DELETE ON public.asset_keyrings
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_asset_keyrings();
