-- Remoção completa do MBR v2.
-- 1) Limpar quaisquer sessões pendentes (drafts) do tipo 'mbr-v2'.
DELETE FROM public.okr_wizard_sessions WHERE wizard_type = 'mbr-v2';

-- 2) Recriar CHECK constraint sem 'mbr-v2'.
ALTER TABLE public.okr_wizard_sessions DROP CONSTRAINT IF EXISTS okr_wizard_sessions_wizard_type_check;
ALTER TABLE public.okr_wizard_sessions ADD CONSTRAINT okr_wizard_sessions_wizard_type_check CHECK (
  wizard_type = ANY (ARRAY[
    'collaborator','leader-prep','team-checkin','managers-checkin','clevel-checkin',
    'team-okr-creation','team-kr-creation',
    'mbr','mbr-pre','mbr-first','mbr-pre-first',
    'qbr-pre','qbr-pre-clevel','qbr-meeting','qbr-post','qbr-report',
    'pre-weekly','weekly'
  ])
);

-- 3) Recriar a função pública de avaliação anônima sem 'mbr-v2'.
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
      WHEN 'qbr-meeting' THEN 'QBR'
      WHEN 'qbr-post'    THEN 'Pós-QBR'
      ELSE s.wizard_type
    END,
    s.wizard_type,
    s.wizard_type IN ('mbr','mbr-first','qbr-meeting','qbr-post'),
    (s.evaluation_open_at IS NOT NULL
       AND s.evaluation_closed_at IS NULL
       AND s.completed_at IS NULL
       AND s.evaluation_open_at > now() - interval '24 hours')
  FROM public.okr_wizard_sessions s
  WHERE UPPER(s.evaluation_short_code) = UPPER(p_short_code)
  LIMIT 1;
END;
$$;