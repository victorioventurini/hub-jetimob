CREATE OR REPLACE FUNCTION public.sync_auth_email_from_work_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_new text := lower(trim(NEW.work_email));
BEGIN
  IF NEW.user_id IS NULL OR v_new IS NULL OR v_new = '' THEN
    RETURN NEW;
  END IF;
  IF lower(coalesce(OLD.work_email,'')) = v_new THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_new AND id <> NEW.user_id) THEN
    RAISE EXCEPTION 'Este e-mail já está em uso por outra conta de acesso.' USING ERRCODE = '23505';
  END IF;
  UPDATE auth.users
     SET email = v_new,
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   WHERE id = NEW.user_id
     AND lower(coalesce(email,'')) <> v_new;
  UPDATE auth.identities
     SET identity_data = identity_data || jsonb_build_object('email', v_new),
         updated_at = now()
   WHERE user_id = NEW.user_id AND provider = 'email';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_auth_email_from_work_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_auth_email_from_work_email ON public.profiles;
CREATE TRIGGER trg_sync_auth_email_from_work_email
AFTER UPDATE OF work_email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_email_from_work_email();