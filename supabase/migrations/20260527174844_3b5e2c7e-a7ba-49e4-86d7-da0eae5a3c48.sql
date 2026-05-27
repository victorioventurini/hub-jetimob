DO $$
DECLARE
  r record;
  def text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('_ticket_email_metadata', '_project_email_metadata')
  LOOP
    def := pg_get_functiondef(r.oid);
    def := replace(def, 'COALESCE(v_bu_name, ''Hub'')', 'COALESCE(v_bu_name, ''Next'')');
    EXECUTE def;
  END LOOP;
END $$;