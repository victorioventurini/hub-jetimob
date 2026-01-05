-- ========================================
-- MIGRATION: OKR Model Evolution (Part 1)
-- Aligned with TCR v1.0.0
-- ========================================

-- 1. Add missing fields to okr_team_objectives
ALTER TABLE public.okr_team_objectives
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS bu_id UUID REFERENCES public.bu_units(id);

-- Backfill year from org_objective
UPDATE public.okr_team_objectives tobj
SET year = org.year
FROM public.okr_org_objectives org
WHERE tobj.org_objective_id = org.id
  AND tobj.year IS NULL;

-- Backfill bu_id from team
UPDATE public.okr_team_objectives tobj
SET bu_id = t.bu_id
FROM public.teams t
WHERE tobj.team_id = t.id
  AND tobj.bu_id IS NULL;

-- 2. Create okr_contributions table for informational relationships
CREATE TYPE public.okr_contribution_entity_type AS ENUM ('objective', 'kr');

CREATE TABLE public.okr_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type okr_contribution_entity_type NOT NULL,
  from_id UUID NOT NULL,
  to_type okr_contribution_entity_type NOT NULL,
  to_id UUID NOT NULL,
  bu_id UUID REFERENCES public.bu_units(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE(from_type, from_id, to_type, to_id)
);

-- Add index for performance
CREATE INDEX idx_okr_contributions_from ON public.okr_contributions(from_type, from_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_okr_contributions_to ON public.okr_contributions(to_type, to_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_okr_contributions_bu ON public.okr_contributions(bu_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.okr_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contributions in their BU"
  ON public.okr_contributions FOR SELECT
  USING (
    deleted_at IS NULL 
    AND (bu_id IS NULL OR bu_id IN (SELECT public.get_user_bus(auth.uid())))
  );

CREATE POLICY "Admins can manage contributions"
  ON public.okr_contributions FOR ALL
  USING (public.is_platform_admin(auth.uid()) OR public.is_bu_admin(auth.uid(), bu_id));

-- 3. Create okr_kr_metrics table for KR ↔ KPI relationships
CREATE TYPE public.okr_metric_role AS ENUM ('primary', 'guardrail');

CREATE TABLE public.okr_kr_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id UUID NOT NULL,
  kr_type TEXT NOT NULL CHECK (kr_type IN ('org', 'team')),
  kpi_id UUID NOT NULL REFERENCES public.kpi_metrics(id),
  role okr_metric_role NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  -- Ensure only one primary per KR
  UNIQUE(kr_id, kr_type, kpi_id)
);

-- Index for performance
CREATE INDEX idx_okr_kr_metrics_kr ON public.okr_kr_metrics(kr_id, kr_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_okr_kr_metrics_kpi ON public.okr_kr_metrics(kpi_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.okr_kr_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view KR metrics"
  ON public.okr_kr_metrics FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage KR metrics"
  ON public.okr_kr_metrics FOR ALL
  USING (public.is_platform_admin(auth.uid()));

-- 4. Trigger to ensure exactly one primary KPI per KR
CREATE OR REPLACE FUNCTION public.validate_kr_primary_metric()
RETURNS TRIGGER AS $$
DECLARE
  existing_primary_count INTEGER;
BEGIN
  -- Only validate on insert or update to primary
  IF NEW.role = 'primary' AND NEW.deleted_at IS NULL THEN
    SELECT COUNT(*) INTO existing_primary_count
    FROM public.okr_kr_metrics
    WHERE kr_id = NEW.kr_id
      AND kr_type = NEW.kr_type
      AND role = 'primary'
      AND deleted_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF existing_primary_count > 0 THEN
      RAISE EXCEPTION 'KR can only have one primary KPI metric';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_kr_primary_metric
  BEFORE INSERT OR UPDATE ON public.okr_kr_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_kr_primary_metric();

-- 5. Update calculate_kr_progress to handle division by zero
CREATE OR REPLACE FUNCTION public.calculate_kr_progress(
  p_baseline numeric,
  p_current numeric,
  p_target numeric,
  p_direction okr_direction
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  progress NUMERIC;
BEGIN
  IF p_direction = 'up' THEN
    -- Handle division by zero
    IF p_target = p_baseline THEN
      RETURN CASE WHEN p_current >= p_target THEN 100 ELSE 0 END;
    END IF;
    progress := ((p_current - p_baseline) / (p_target - p_baseline)) * 100;
  ELSE
    -- Handle division by zero for down direction
    IF p_baseline = p_target THEN
      RETURN CASE WHEN p_current <= p_target THEN 100 ELSE 0 END;
    END IF;
    progress := ((p_baseline - p_current) / (p_baseline - p_target)) * 100;
  END IF;
  
  -- Clamp between 0 and 100
  RETURN GREATEST(0, LEAST(100, progress));
END;
$$;

-- 6. Function to validate contribution rules
CREATE OR REPLACE FUNCTION public.validate_okr_contribution()
RETURNS TRIGGER AS $$
DECLARE
  from_kr_type TEXT;
  to_kr_type TEXT;
BEGIN
  -- Prevent self-reference
  IF NEW.from_type = NEW.to_type AND NEW.from_id = NEW.to_id THEN
    RAISE EXCEPTION 'Cannot create self-referencing contribution';
  END IF;

  -- If from is a KR, check its type for validation
  IF NEW.from_type = 'kr' THEN
    -- Try to get team KR type
    SELECT type INTO from_kr_type
    FROM public.okr_team_key_results
    WHERE id = NEW.from_id AND deleted_at IS NULL;
    
    -- Validate: foundational KRs cannot contribute to org KRs
    IF from_kr_type = 'foundational' AND NEW.to_type = 'kr' THEN
      -- Check if target is an org KR
      IF EXISTS (SELECT 1 FROM public.okr_org_key_results WHERE id = NEW.to_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Foundational KRs cannot directly contribute to organizational KRs';
      END IF;
    END IF;
    
    -- Validate: enabler KRs cannot directly contribute to org KRs
    IF from_kr_type = 'enabler' AND NEW.to_type = 'kr' THEN
      IF EXISTS (SELECT 1 FROM public.okr_org_key_results WHERE id = NEW.to_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Enabler KRs cannot directly contribute to organizational KRs';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_okr_contribution
  BEFORE INSERT OR UPDATE ON public.okr_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_okr_contribution();

-- 7. Audit trigger for new tables
CREATE TRIGGER audit_okr_contributions
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.okr_audit_trigger();

CREATE TRIGGER audit_okr_kr_metrics
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_kr_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.okr_audit_trigger();