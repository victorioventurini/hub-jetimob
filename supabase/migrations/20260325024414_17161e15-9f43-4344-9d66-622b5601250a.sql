
-- Phase 1: QBR Foundation Schema
-- 1. Add qbr_status to cycles
ALTER TABLE public.cycles
ADD COLUMN IF NOT EXISTS qbr_status text NOT NULL DEFAULT 'closed';

-- Add check constraint for qbr_status
ALTER TABLE public.cycles
ADD CONSTRAINT cycles_qbr_status_check
CHECK (qbr_status IN ('closed', 'open', 'collecting', 'reviewing', 'ready', 'done'));

-- 2. Add QBR fields to okr_team_objectives
ALTER TABLE public.okr_team_objectives
ADD COLUMN IF NOT EXISTS qbr_origin_session_id uuid REFERENCES public.okr_wizard_sessions(id),
ADD COLUMN IF NOT EXISTS qbr_approval_status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS qbr_discard_reason text;

ALTER TABLE public.okr_team_objectives
ADD CONSTRAINT okr_team_objectives_qbr_approval_status_check
CHECK (qbr_approval_status IN ('draft', 'approved', 'approved_with_changes', 'discarded', 'defer'));

-- 3. Add zombie_candidate and kpi_to_create to kpi_metrics
ALTER TABLE public.kpi_metrics
ADD COLUMN IF NOT EXISTS zombie_candidate boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS kpi_to_create boolean NOT NULL DEFAULT false;

-- 4. Update wizard_type check constraint to include QBR types + team-kr-creation
ALTER TABLE public.okr_wizard_sessions
DROP CONSTRAINT IF EXISTS okr_wizard_sessions_wizard_type_check;

ALTER TABLE public.okr_wizard_sessions
ADD CONSTRAINT okr_wizard_sessions_wizard_type_check
CHECK (wizard_type = ANY (ARRAY[
  'collaborator'::text,
  'leader-prep'::text,
  'team-checkin'::text,
  'managers-checkin'::text,
  'clevel-checkin'::text,
  'team-okr-creation'::text,
  'team-kr-creation'::text,
  'mbr'::text,
  'qbr-pre'::text,
  'qbr-pre-clevel'::text,
  'qbr-meeting'::text,
  'qbr-post'::text,
  'qbr-report'::text
]));

-- 5. Trigger to validate qbr_status transitions
CREATE OR REPLACE FUNCTION public.fn_validate_qbr_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.qbr_status = NEW.qbr_status THEN
    RETURN NEW;
  END IF;

  -- Valid transitions
  IF (OLD.qbr_status = 'closed' AND NEW.qbr_status = 'open')
    OR (OLD.qbr_status = 'open' AND NEW.qbr_status = 'collecting')
    OR (OLD.qbr_status = 'collecting' AND NEW.qbr_status = 'reviewing')
    OR (OLD.qbr_status = 'reviewing' AND NEW.qbr_status = 'ready')
    OR (OLD.qbr_status = 'ready' AND NEW.qbr_status = 'done')
    -- Allow reset
    OR (NEW.qbr_status = 'closed')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid qbr_status transition: % -> %', OLD.qbr_status, NEW.qbr_status;
END;
$$;

CREATE TRIGGER trg_validate_qbr_status_transition
  BEFORE UPDATE OF qbr_status ON public.cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_qbr_status_transition();
