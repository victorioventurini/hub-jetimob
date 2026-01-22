-- Add INSERT policy for app_error_logs to allow all authenticated users to log errors
-- This includes external users (partner_contacts) who also need error logging capability

-- First check if INSERT policy already exists, if not create one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    WHERE cls.relname = 'app_error_logs' AND pol.polcmd = 'a'
  ) THEN
    -- Create INSERT policy for all authenticated users
    EXECUTE 'CREATE POLICY app_error_logs_insert_v1 ON public.app_error_logs FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END $$;

COMMENT ON POLICY app_error_logs_insert_v1 ON public.app_error_logs IS 
'Allows all authenticated users (internal and external) to insert error logs. 
Error logging should never be blocked by RLS as it helps with debugging.';