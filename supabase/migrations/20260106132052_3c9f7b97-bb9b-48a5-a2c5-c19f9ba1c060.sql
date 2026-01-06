
-- =============================================
-- OKR Module Evolution: Cycles, Cancellation, and Limits
-- =============================================

-- 1. Create discarded status if not exists (add to okr_status enum)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'discarded' AND enumtypid = 'okr_status'::regtype) THEN
    ALTER TYPE okr_status ADD VALUE IF NOT EXISTS 'discarded';
  END IF;
END $$;

-- 2. Add cycle_id to okr_org_objectives (annual cycle)
ALTER TABLE public.okr_org_objectives 
ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.cycles(id);

-- 3. Add start_date and end_date to org objectives (inherited from cycle but stored for reference)
ALTER TABLE public.okr_org_objectives 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 4. Add cycle_type field to distinguish annual vs quarterly objectives
ALTER TABLE public.okr_team_objectives
ADD COLUMN IF NOT EXISTS cycle_type TEXT DEFAULT 'quarter' CHECK (cycle_type IN ('quarter', 'year'));

-- 5. Add cancellation fields to okr_org_objectives
ALTER TABLE public.okr_org_objectives
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_learning TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- 6. Add cancellation fields to okr_team_objectives
ALTER TABLE public.okr_team_objectives
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_learning TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- 7. Add cancellation fields to okr_org_key_results
ALTER TABLE public.okr_org_key_results
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_learning TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- 8. Add cancellation fields to okr_team_key_results  
ALTER TABLE public.okr_team_key_results
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_learning TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- 9. Add quarterly review tracking to team objectives
ALTER TABLE public.okr_team_objectives
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_review_due TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- 10. Create table for objective reviews/revisions history
CREATE TABLE IF NOT EXISTS public.okr_objective_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL,
  objective_type TEXT NOT NULL CHECK (objective_type IN ('org', 'team')),
  review_type TEXT NOT NULL CHECK (review_type IN ('quarterly', 'mid_year', 'annual', 'ad_hoc')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changes_summary TEXT,
  notes TEXT,
  bu_id UUID REFERENCES public.bu_units(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. RLS for objective reviews
ALTER TABLE public.okr_objective_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews in their BU"
  ON public.okr_objective_reviews FOR SELECT
  USING (
    bu_id IS NULL 
    OR public.user_has_bu_access(auth.uid(), bu_id)
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Authenticated users can create reviews"
  ON public.okr_objective_reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 12. Create cancellation reasons enum/lookup
CREATE TABLE IF NOT EXISTS public.okr_cancellation_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  applies_to TEXT[] DEFAULT ARRAY['objective', 'kr'],
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Insert standard cancellation reasons
INSERT INTO public.okr_cancellation_reasons (code, label, description, applies_to, display_order)
VALUES 
  ('strategic_pivot', 'Pivô estratégico', 'A direção estratégica da empresa mudou', ARRAY['objective', 'kr'], 1),
  ('market_change', 'Mudança de mercado', 'Condições de mercado tornaram o objetivo irrelevante', ARRAY['objective', 'kr'], 2),
  ('resource_constraint', 'Restrição de recursos', 'Recursos foram realocados para prioridades mais urgentes', ARRAY['objective', 'kr'], 3),
  ('dependency_blocked', 'Dependência bloqueada', 'Uma dependência crítica impediu o progresso', ARRAY['kr'], 4),
  ('duplicate', 'Duplicado', 'Este objetivo/KR foi consolidado com outro', ARRAY['objective', 'kr'], 5),
  ('not_achievable', 'Inatingível', 'O objetivo se mostrou impossível de atingir', ARRAY['objective', 'kr'], 6),
  ('scope_change', 'Mudança de escopo', 'O escopo foi redefinido significativamente', ARRAY['objective', 'kr'], 7),
  ('other', 'Outro motivo', 'Outro motivo não listado', ARRAY['objective', 'kr'], 99)
ON CONFLICT (code) DO NOTHING;

-- 13. RLS for cancellation reasons (public read)
ALTER TABLE public.okr_cancellation_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cancellation reasons"
  ON public.okr_cancellation_reasons FOR SELECT
  USING (true);

-- 14. Update validate_okr_contribution function to enforce new rules
CREATE OR REPLACE FUNCTION public.validate_okr_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  from_kr_type TEXT;
  to_entity_type TEXT;
  contribution_count INTEGER;
BEGIN
  -- Prevent self-reference
  IF NEW.from_type = NEW.to_type AND NEW.from_id = NEW.to_id THEN
    RAISE EXCEPTION 'Cannot create self-referencing contribution';
  END IF;

  -- Rule: Only KR (contribution type) can link to Org KR
  IF NEW.from_type = 'kr' AND NEW.to_type = 'kr' THEN
    -- Check if from is a team KR
    SELECT type INTO from_kr_type
    FROM public.okr_team_key_results
    WHERE id = NEW.from_id AND deleted_at IS NULL;
    
    -- If it's a team KR, check the type
    IF from_kr_type IS NOT NULL THEN
      -- Only 'contribution' type KRs can link to org KRs
      IF from_kr_type != 'contribution' THEN
        -- Check if target is an org KR
        IF EXISTS (SELECT 1 FROM public.okr_org_key_results WHERE id = NEW.to_id AND deleted_at IS NULL) THEN
          RAISE EXCEPTION 'Only contribution-type KRs can link to organizational KRs. Enabler and foundational KRs cannot directly contribute.';
        END IF;
      END IF;
      
      -- Limit: One team KR can contribute to only ONE org KR
      SELECT COUNT(*) INTO contribution_count
      FROM public.okr_contributions
      WHERE from_type = 'kr' 
        AND from_id = NEW.from_id
        AND to_type = 'kr'
        AND deleted_at IS NULL
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
      
      IF contribution_count >= 1 THEN
        RAISE EXCEPTION 'A team KR can only contribute to one organizational KR';
      END IF;
    END IF;
  END IF;

  -- Rule: Objective can only link to higher-level objective (team -> org)
  IF NEW.from_type = 'objective' AND NEW.to_type = 'objective' THEN
    -- Check if from is a team objective linking to org objective
    IF EXISTS (SELECT 1 FROM public.okr_team_objectives WHERE id = NEW.from_id AND deleted_at IS NULL) THEN
      -- Target must be an org objective
      IF NOT EXISTS (SELECT 1 FROM public.okr_org_objectives WHERE id = NEW.to_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Team objectives can only link to organizational objectives';
      END IF;
    ELSE
      -- Org objectives cannot link to other objectives
      RAISE EXCEPTION 'Organizational objectives cannot create contribution links';
    END IF;
  END IF;

  -- Rule: Prevent KR from linking to objectives (invalid relationship)
  IF NEW.from_type = 'kr' AND NEW.to_type = 'objective' THEN
    RAISE EXCEPTION 'KRs cannot directly contribute to objectives. Link KR to another KR instead.';
  END IF;

  RETURN NEW;
END;
$$;

-- 15. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_okr_contributions_from ON public.okr_contributions(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_okr_contributions_to ON public.okr_contributions(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_okr_objective_reviews_objective ON public.okr_objective_reviews(objective_id, objective_type);
CREATE INDEX IF NOT EXISTS idx_okr_team_objectives_cycle ON public.okr_team_objectives(cycle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_okr_org_objectives_cycle ON public.okr_org_objectives(cycle_id) WHERE deleted_at IS NULL;
