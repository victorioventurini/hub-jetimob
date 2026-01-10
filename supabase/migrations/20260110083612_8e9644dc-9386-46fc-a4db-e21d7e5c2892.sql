-- Fix wizard_type constraint to include team-okr-creation
ALTER TABLE public.okr_wizard_sessions
  DROP CONSTRAINT IF EXISTS okr_wizard_sessions_wizard_type_check;

ALTER TABLE public.okr_wizard_sessions
  ADD CONSTRAINT okr_wizard_sessions_wizard_type_check
  CHECK (wizard_type IN (
    'collaborator',
    'leader-prep',
    'team-checkin',
    'managers-checkin',
    'clevel-checkin',
    'team-okr-creation'
  ));