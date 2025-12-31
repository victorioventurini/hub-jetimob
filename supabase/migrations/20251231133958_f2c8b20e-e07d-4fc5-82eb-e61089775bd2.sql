-- Create trigger function for automatic profile audit logging
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
    VALUES (auth.uid(), 'create', 'profile', NEW.id, to_jsonb(NEW), now());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, created_at)
    VALUES (auth.uid(), 'update', 'profile', NEW.id, to_jsonb(OLD), to_jsonb(NEW), now());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, created_at)
    VALUES (auth.uid(), 'delete', 'profile', OLD.id, to_jsonb(OLD), now());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Apply trigger to profiles table for all changes
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_changes();