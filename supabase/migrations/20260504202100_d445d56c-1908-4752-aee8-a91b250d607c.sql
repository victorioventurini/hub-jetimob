CREATE OR REPLACE FUNCTION public.get_public_ritual_evaluation_form(p_short_code TEXT)
RETURNS TABLE (
  session_id        UUID,
  ritual_label      TEXT,
  wizard_type       TEXT,
  show_what_worked  BOOLEAN,
  is_open           BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    CASE s.wizard_type
      WHEN 'mbr'         THEN 'MBR'
      WHEN 'mbr-first'   THEN 'MBR'
      WHEN 'mbr-v2'      THEN 'MBR v2'
      WHEN 'qbr-meeting' THEN 'QBR'
      WHEN 'qbr-post'    THEN 'Pós-QBR'
      ELSE s.wizard_type
    END,
    s.wizard_type,
    s.wizard_type IN ('mbr','mbr-first','mbr-v2','qbr-meeting','qbr-post'),
    (s.evaluation_open_at IS NOT NULL
       AND s.evaluation_closed_at IS NULL
       AND s.completed_at IS NULL
       AND s.evaluation_open_at > now() - interval '24 hours')
  FROM public.okr_wizard_sessions s
  WHERE UPPER(s.evaluation_short_code) = UPPER(p_short_code)
  LIMIT 1;
END;
$$;