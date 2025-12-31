-- ========================
-- ENUMS
-- ========================
CREATE TYPE okr_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE okr_rag_status AS ENUM ('green', 'yellow', 'red', 'not_started');
CREATE TYPE okr_kr_type AS ENUM ('contribution', 'enabler', 'foundational');
CREATE TYPE okr_direction AS ENUM ('up', 'down');
CREATE TYPE okr_confidence AS ENUM ('high', 'medium', 'low');
CREATE TYPE okr_dependency_status AS ENUM ('ok', 'blocked', 'at_risk');
CREATE TYPE okr_report_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'event');
CREATE TYPE okr_channel AS ENUM ('email', 'slack', 'both');

-- ========================
-- ORG OBJECTIVES
-- ========================
CREATE TABLE public.okr_org_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  status okr_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.okr_org_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active org objectives"
  ON public.okr_org_objectives FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage org objectives"
  ON public.okr_org_objectives FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

-- ========================
-- ORG KEY RESULTS
-- ========================
CREATE TABLE public.okr_org_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_objective_id UUID NOT NULL REFERENCES public.okr_org_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  metric_id UUID REFERENCES public.metrics(id),
  baseline NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target NUMERIC NOT NULL,
  direction okr_direction NOT NULL DEFAULT 'up',
  unit TEXT NOT NULL DEFAULT '%',
  owner_user_id UUID REFERENCES auth.users(id),
  status okr_rag_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.okr_org_key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active org key results"
  ON public.okr_org_key_results FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage org key results"
  ON public.okr_org_key_results FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

-- ========================
-- TEAM OBJECTIVES
-- ========================
CREATE TABLE public.okr_team_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id),
  org_objective_id UUID NOT NULL REFERENCES public.okr_org_objectives(id),
  cycle_id UUID REFERENCES public.cycles(id),
  title TEXT NOT NULL,
  description TEXT,
  owner_user_id UUID REFERENCES auth.users(id),
  status okr_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT max_3_objectives_per_team CHECK (true) -- enforced via trigger
);

ALTER TABLE public.okr_team_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active team objectives"
  ON public.okr_team_objectives FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage all team objectives"
  ON public.okr_team_objectives FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "Team leaders can manage their team objectives"
  ON public.okr_team_objectives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = okr_team_objectives.team_id
      AND t.leader_user_id = auth.uid()
    )
  );

-- ========================
-- TEAM KEY RESULTS
-- ========================
CREATE TABLE public.okr_team_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_objective_id UUID REFERENCES public.okr_team_objectives(id) ON DELETE CASCADE,
  parent_kr_id UUID REFERENCES public.okr_team_key_results(id),
  team_id UUID NOT NULL REFERENCES public.teams(id),
  title TEXT NOT NULL,
  type okr_kr_type NOT NULL DEFAULT 'contribution',
  metric_id UUID REFERENCES public.metrics(id),
  baseline NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target NUMERIC NOT NULL,
  direction okr_direction NOT NULL DEFAULT 'up',
  unit TEXT NOT NULL DEFAULT '%',
  owner_user_id UUID REFERENCES auth.users(id),
  co_responsibles UUID[] DEFAULT '{}',
  linked_org_kr_id UUID REFERENCES public.okr_org_key_results(id),
  status okr_rag_status NOT NULL DEFAULT 'not_started',
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT has_objective_or_parent CHECK (team_objective_id IS NOT NULL OR parent_kr_id IS NOT NULL)
);

ALTER TABLE public.okr_team_key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active team key results"
  ON public.okr_team_key_results FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage all team key results"
  ON public.okr_team_key_results FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "KR owners can update their KRs"
  ON public.okr_team_key_results FOR UPDATE
  USING (owner_user_id = auth.uid() OR auth.uid() = ANY(co_responsibles));

CREATE POLICY "Team leaders can manage their team KRs"
  ON public.okr_team_key_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = okr_team_key_results.team_id
      AND t.leader_user_id = auth.uid()
    )
  );

-- ========================
-- DEPENDENCIES
-- ========================
CREATE TABLE public.okr_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id UUID NOT NULL REFERENCES public.okr_team_key_results(id) ON DELETE CASCADE,
  depends_on_team_id UUID REFERENCES public.teams(id),
  depends_on_kr_id UUID REFERENCES public.okr_team_key_results(id),
  description TEXT,
  status okr_dependency_status NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT has_dependency_target CHECK (depends_on_team_id IS NOT NULL OR depends_on_kr_id IS NOT NULL)
);

ALTER TABLE public.okr_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dependencies"
  ON public.okr_dependencies FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage dependencies"
  ON public.okr_dependencies FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "KR owners can manage dependencies"
  ON public.okr_dependencies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.okr_team_key_results kr
      WHERE kr.id = okr_dependencies.kr_id
      AND (kr.owner_user_id = auth.uid() OR auth.uid() = ANY(kr.co_responsibles))
    )
  );

-- ========================
-- CHECK-INS
-- ========================
CREATE TABLE public.okr_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id UUID NOT NULL REFERENCES public.okr_team_key_results(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  previous_value NUMERIC,
  current_value NUMERIC NOT NULL,
  confidence okr_confidence NOT NULL DEFAULT 'medium',
  blockers TEXT,
  comments TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checkins"
  ON public.okr_checkins FOR SELECT
  USING (true);

CREATE POLICY "KR owners can create checkins"
  ON public.okr_checkins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.okr_team_key_results kr
      WHERE kr.id = okr_checkins.kr_id
      AND (kr.owner_user_id = auth.uid() OR auth.uid() = ANY(kr.co_responsibles))
    )
  );

CREATE POLICY "Admins can manage checkins"
  ON public.okr_checkins FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

-- ========================
-- REPORTS CONFIG
-- ========================
CREATE TABLE public.okr_reports_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  frequency okr_report_frequency NOT NULL DEFAULT 'weekly',
  audience UUID[] DEFAULT '{}',
  content_blocks JSONB DEFAULT '[]',
  channels okr_channel NOT NULL DEFAULT 'email',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_reports_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reports config"
  ON public.okr_reports_config FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "Users can view active reports config"
  ON public.okr_reports_config FOR SELECT
  USING (is_active = true);

-- ========================
-- NOTIFICATIONS LOG
-- ========================
CREATE TABLE public.okr_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  channel okr_channel NOT NULL,
  target UUID NOT NULL,
  payload JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT
);

ALTER TABLE public.okr_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notifications log"
  ON public.okr_notifications_log FOR SELECT
  USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "System can insert notifications"
  ON public.okr_notifications_log FOR INSERT
  WITH CHECK (true);

-- ========================
-- AUDIT LOG
-- ========================
CREATE TABLE public.okr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.okr_audit_log FOR SELECT
  USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "System can insert audit log"
  ON public.okr_audit_log FOR INSERT
  WITH CHECK (true);

-- ========================
-- FUNCTIONS
-- ========================

-- Calculate KR progress
CREATE OR REPLACE FUNCTION public.calculate_kr_progress(
  p_baseline NUMERIC,
  p_current NUMERIC,
  p_target NUMERIC,
  p_direction okr_direction
) RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  progress NUMERIC;
BEGIN
  IF p_direction = 'up' THEN
    IF p_target = p_baseline THEN
      RETURN CASE WHEN p_current >= p_target THEN 100 ELSE 0 END;
    END IF;
    progress := ((p_current - p_baseline) / (p_target - p_baseline)) * 100;
  ELSE
    IF p_baseline = p_target THEN
      RETURN CASE WHEN p_current <= p_target THEN 100 ELSE 0 END;
    END IF;
    progress := ((p_baseline - p_current) / (p_baseline - p_target)) * 100;
  END IF;
  
  RETURN GREATEST(0, LEAST(100, progress));
END;
$$;

-- Validate max 3 objectives per team
CREATE OR REPLACE FUNCTION public.validate_max_team_objectives()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  objective_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO objective_count
  FROM public.okr_team_objectives
  WHERE team_id = NEW.team_id
    AND deleted_at IS NULL
    AND status != 'cancelled'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF objective_count >= 3 THEN
    RAISE EXCEPTION 'Team cannot have more than 3 active objectives';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_max_team_objectives
  BEFORE INSERT OR UPDATE ON public.okr_team_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_max_team_objectives();

-- Validate max 3 KRs per objective
CREATE OR REPLACE FUNCTION public.validate_max_kr_per_objective()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kr_count INTEGER;
BEGIN
  IF NEW.team_objective_id IS NOT NULL THEN
    SELECT COUNT(*) INTO kr_count
    FROM public.okr_team_key_results
    WHERE team_objective_id = NEW.team_objective_id
      AND deleted_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF kr_count >= 3 THEN
      RAISE EXCEPTION 'Objective cannot have more than 3 key results';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_max_kr_per_objective
  BEFORE INSERT OR UPDATE ON public.okr_team_key_results
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_max_kr_per_objective();

-- Update KR current value on checkin
CREATE OR REPLACE FUNCTION public.update_kr_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.okr_team_key_results
  SET current_value = NEW.current_value,
      updated_at = now()
  WHERE id = NEW.kr_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_kr_on_checkin_trigger
  AFTER INSERT ON public.okr_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kr_on_checkin();

-- Audit trigger for OKR changes
CREATE OR REPLACE FUNCTION public.okr_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.okr_audit_log (entity, entity_id, action, new_value, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.okr_audit_log (entity, entity_id, action, old_value, new_value, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.okr_audit_log (entity, entity_id, action, old_value, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Apply audit triggers
CREATE TRIGGER audit_okr_org_objectives
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_org_objectives
  FOR EACH ROW EXECUTE FUNCTION public.okr_audit_trigger();

CREATE TRIGGER audit_okr_org_key_results
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_org_key_results
  FOR EACH ROW EXECUTE FUNCTION public.okr_audit_trigger();

CREATE TRIGGER audit_okr_team_objectives
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_team_objectives
  FOR EACH ROW EXECUTE FUNCTION public.okr_audit_trigger();

CREATE TRIGGER audit_okr_team_key_results
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_team_key_results
  FOR EACH ROW EXECUTE FUNCTION public.okr_audit_trigger();

-- Updated_at triggers
CREATE TRIGGER update_okr_org_objectives_updated_at
  BEFORE UPDATE ON public.okr_org_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_okr_org_key_results_updated_at
  BEFORE UPDATE ON public.okr_org_key_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_okr_team_objectives_updated_at
  BEFORE UPDATE ON public.okr_team_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_okr_team_key_results_updated_at
  BEFORE UPDATE ON public.okr_team_key_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_okr_dependencies_updated_at
  BEFORE UPDATE ON public.okr_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_okr_reports_config_updated_at
  BEFORE UPDATE ON public.okr_reports_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_okr_org_objectives_year ON public.okr_org_objectives(year);
CREATE INDEX idx_okr_org_objectives_status ON public.okr_org_objectives(status);
CREATE INDEX idx_okr_org_key_results_objective ON public.okr_org_key_results(org_objective_id);
CREATE INDEX idx_okr_team_objectives_team ON public.okr_team_objectives(team_id);
CREATE INDEX idx_okr_team_objectives_org ON public.okr_team_objectives(org_objective_id);
CREATE INDEX idx_okr_team_key_results_objective ON public.okr_team_key_results(team_objective_id);
CREATE INDEX idx_okr_team_key_results_team ON public.okr_team_key_results(team_id);
CREATE INDEX idx_okr_team_key_results_owner ON public.okr_team_key_results(owner_user_id);
CREATE INDEX idx_okr_checkins_kr ON public.okr_checkins(kr_id);
CREATE INDEX idx_okr_checkins_date ON public.okr_checkins(date);
CREATE INDEX idx_okr_dependencies_kr ON public.okr_dependencies(kr_id);
CREATE INDEX idx_okr_audit_log_entity ON public.okr_audit_log(entity, entity_id);