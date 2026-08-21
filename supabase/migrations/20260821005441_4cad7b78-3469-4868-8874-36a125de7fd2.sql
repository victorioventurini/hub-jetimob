-- ============================================================
-- BU API KEYS — chaves de API por unidade de negócio
-- ============================================================

CREATE TABLE public.bu_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  consumer_system text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_bu_api_keys_bu_id ON public.bu_api_keys(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bu_api_keys_hash_active ON public.bu_api_keys(key_hash) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bu_api_keys TO authenticated;
GRANT ALL ON public.bu_api_keys TO service_role;

ALTER TABLE public.bu_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bu_api_keys_select_admin"
  ON public.bu_api_keys FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (public.is_current_bu(bu_id) AND public.is_profile_bu_admin(public.my_profile_id(), bu_id))
  );

CREATE POLICY "bu_api_keys_insert_admin"
  ON public.bu_api_keys FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR (public.is_current_bu(bu_id) AND public.is_profile_bu_admin(public.my_profile_id(), bu_id))
  );

CREATE POLICY "bu_api_keys_update_admin"
  ON public.bu_api_keys FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (public.is_current_bu(bu_id) AND public.is_profile_bu_admin(public.my_profile_id(), bu_id))
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR (public.is_current_bu(bu_id) AND public.is_profile_bu_admin(public.my_profile_id(), bu_id))
  );

CREATE POLICY "bu_api_keys_delete_admin"
  ON public.bu_api_keys FOR DELETE TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (public.is_current_bu(bu_id) AND public.is_profile_bu_admin(public.my_profile_id(), bu_id))
  );

-- Validation trigger (no CHECK constraints per project standard)
CREATE OR REPLACE FUNCTION public.bu_api_keys_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'revoked') THEN
    RAISE EXCEPTION 'INVALID_STATUS: bu_api_keys.status must be active or revoked';
  END IF;

  IF btrim(COALESCE(NEW.name, '')) = '' THEN
    RAISE EXCEPTION 'INVALID_NAME: bu_api_keys.name cannot be empty';
  END IF;

  IF btrim(COALESCE(NEW.consumer_system, '')) = '' THEN
    RAISE EXCEPTION 'INVALID_CONSUMER_SYSTEM: bu_api_keys.consumer_system cannot be empty';
  END IF;

  IF NEW.rate_limit_per_minute < 1 OR NEW.rate_limit_per_minute > 6000 THEN
    RAISE EXCEPTION 'INVALID_RATE_LIMIT: bu_api_keys.rate_limit_per_minute must be between 1 and 6000';
  END IF;

  IF array_length(NEW.scopes, 1) IS NULL THEN
    RAISE EXCEPTION 'INVALID_SCOPES: bu_api_keys.scopes cannot be empty';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(NEW.scopes) s
    WHERE s !~ '^[a-z_]+:(read|write)$'
  ) THEN
    RAISE EXCEPTION 'INVALID_SCOPES: scopes must follow the <module>:<read|write> format';
  END IF;

  IF NEW.status = 'revoked' AND NEW.revoked_at IS NULL THEN
    NEW.revoked_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bu_api_keys_validate_trigger
  BEFORE INSERT OR UPDATE ON public.bu_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.bu_api_keys_validate();

CREATE TRIGGER bu_api_keys_enforce_bu_scope
  BEFORE INSERT OR UPDATE ON public.bu_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

CREATE TRIGGER update_bu_api_keys_updated_at
  BEFORE UPDATE ON public.bu_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- USAGE LOGS
-- ============================================================

CREATE TABLE public.bu_api_key_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES public.bu_api_keys(id) ON DELETE CASCADE,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  method text NOT NULL,
  route text NOT NULL,
  status_code integer NOT NULL,
  latency_ms integer,
  ip_address text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bu_api_key_usage_logs_key ON public.bu_api_key_usage_logs(api_key_id, created_at DESC);
CREATE INDEX idx_bu_api_key_usage_logs_bu ON public.bu_api_key_usage_logs(bu_id, created_at DESC);

GRANT SELECT ON public.bu_api_key_usage_logs TO authenticated;
GRANT ALL ON public.bu_api_key_usage_logs TO service_role;

ALTER TABLE public.bu_api_key_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bu_api_key_usage_logs_select_admin"
  ON public.bu_api_key_usage_logs FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (public.is_current_bu(bu_id) AND public.is_profile_bu_admin(public.my_profile_id(), bu_id))
  );