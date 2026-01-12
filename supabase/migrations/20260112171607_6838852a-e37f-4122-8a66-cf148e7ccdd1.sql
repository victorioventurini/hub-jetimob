
-- FIX: permission audit logging must store profiles.id (domain id), not auth.users.id
-- log_permission_change currently inserts auth.uid() into permission_audit_log.actor_id,
-- which breaks identity convention and can fail RLS/validation.

CREATE OR REPLACE FUNCTION public.log_permission_change(
  p_bu_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_entity_name text DEFAULT NULL,
  p_before_state jsonb DEFAULT NULL,
  p_after_state jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_actor_profile_id uuid;
BEGIN
  -- actor_id must be profiles.id (domain). Never store auth.uid() in domain columns.
  v_actor_profile_id := public.my_profile_id();
  IF v_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'log_permission_change: missing profile for current user';
  END IF;

  INSERT INTO public.permission_audit_log (
    bu_id,
    target_user_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    before_state,
    after_state,
    reason
  )
  VALUES (
    p_bu_id,
    p_target_user_id,
    v_actor_profile_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_before_state,
    p_after_state,
    COALESCE(p_reason, '')
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_permission_change(uuid, uuid, text, text, uuid, text, jsonb, jsonb, text)
IS 'Writes permission audit log. actor_id is profiles.id (domain).';
