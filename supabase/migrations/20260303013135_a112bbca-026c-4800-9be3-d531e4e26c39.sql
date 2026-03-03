-- Add 'mbr' to the wizard_type check constraint
ALTER TABLE public.okr_wizard_sessions 
DROP CONSTRAINT okr_wizard_sessions_wizard_type_check;

ALTER TABLE public.okr_wizard_sessions 
ADD CONSTRAINT okr_wizard_sessions_wizard_type_check 
CHECK (wizard_type = ANY (ARRAY[
  'collaborator'::text, 
  'leader-prep'::text, 
  'team-checkin'::text, 
  'managers-checkin'::text, 
  'clevel-checkin'::text, 
  'team-okr-creation'::text,
  'mbr'::text
]));