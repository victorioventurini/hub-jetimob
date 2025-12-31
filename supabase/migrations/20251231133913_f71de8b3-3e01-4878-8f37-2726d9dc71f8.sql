-- Create a SECURITY DEFINER function that validates and inserts audit logs
-- This ensures only trusted auth.uid() is used and clients cannot manipulate user_id
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert audit log with trusted auth.uid()
  -- Cannot be manipulated by client
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    auth.uid(), -- Trusted user ID from auth context
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', NULL),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', NULL),
    now()
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;

-- Remove the existing permissive INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a restrictive policy that only allows service_role to insert directly
-- Normal users must use the log_audit_event function
CREATE POLICY "Service can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);