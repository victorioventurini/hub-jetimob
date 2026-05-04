ALTER TABLE public.okr_wizard_sessions DROP CONSTRAINT IF EXISTS okr_wizard_sessions_wizard_type_check;
ALTER TABLE public.okr_wizard_sessions ADD CONSTRAINT okr_wizard_sessions_wizard_type_check CHECK (
  wizard_type = ANY (ARRAY[
    'collaborator','leader-prep','team-checkin','managers-checkin','clevel-checkin',
    'team-okr-creation','team-kr-creation',
    'mbr','mbr-pre','mbr-first','mbr-pre-first','mbr-v2',
    'qbr-pre','qbr-pre-clevel','qbr-meeting','qbr-post','qbr-report',
    'pre-weekly','weekly'
  ])
);