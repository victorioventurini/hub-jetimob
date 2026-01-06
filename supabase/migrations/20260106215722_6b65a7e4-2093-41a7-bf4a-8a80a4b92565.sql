-- ==========================================================
-- OKRs vNext: Health Score + Insights + Coaching
-- ==========================================================

-- A1) Adicionar colunas de Health Score aos Objectives

-- Org Objectives
ALTER TABLE public.okr_org_objectives 
ADD COLUMN IF NOT EXISTS health_score INTEGER,
ADD COLUMN IF NOT EXISTS health_status TEXT CHECK (health_status IN ('healthy', 'attention', 'risk')),
ADD COLUMN IF NOT EXISTS last_health_calculated_at TIMESTAMPTZ;

-- Team Objectives
ALTER TABLE public.okr_team_objectives 
ADD COLUMN IF NOT EXISTS health_score INTEGER,
ADD COLUMN IF NOT EXISTS health_status TEXT CHECK (health_status IN ('healthy', 'attention', 'risk')),
ADD COLUMN IF NOT EXISTS last_health_calculated_at TIMESTAMPTZ;

-- A2) Criar tabela de Insights
CREATE TABLE IF NOT EXISTS public.okr_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES public.bu_units(id),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('org_objective', 'team_objective', 'org_kr', 'team_kr')),
  scope_id UUID NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  suggested_actions JSONB,
  source TEXT NOT NULL CHECK (source IN ('rules', 'ai')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_okr_insights_scope 
ON public.okr_insights(bu_id, scope_type, scope_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_okr_insights_severity 
ON public.okr_insights(bu_id, severity) 
WHERE deleted_at IS NULL;

-- A3) Criar tabela de Coaching Events (telemetria)
CREATE TABLE IF NOT EXISTS public.okr_coaching_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES public.bu_units(id),
  user_id UUID NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('dashboard', 'objective', 'kr', 'checkin', 'planning')),
  context_id UUID,
  agent_slug TEXT,
  insight_id UUID REFERENCES public.okr_insights(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('shown', 'clicked', 'dismissed', 'applied')),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_okr_coaching_events_user 
ON public.okr_coaching_events(bu_id, user_id, created_at DESC);

-- A4) Views para facilitar frontend

-- View de Health por Objetivo
CREATE OR REPLACE VIEW public.v_objective_health AS
SELECT 
  'org' AS objective_type,
  id AS objective_id,
  bu_id,
  health_score,
  health_status,
  last_health_calculated_at
FROM public.okr_org_objectives
WHERE deleted_at IS NULL AND status != 'cancelled'
UNION ALL
SELECT 
  'team' AS objective_type,
  id AS objective_id,
  bu_id,
  health_score,
  health_status,
  last_health_calculated_at
FROM public.okr_team_objectives
WHERE deleted_at IS NULL AND status != 'cancelled';

-- View de Insights Ativos
CREATE OR REPLACE VIEW public.v_okr_insights_active AS
SELECT *
FROM public.okr_insights
WHERE deleted_at IS NULL
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'warning' THEN 2 
    WHEN 'info' THEN 3 
  END,
  created_at DESC;

-- ==========================================================
-- B) FUNÇÕES DE HEALTH SCORE
-- ==========================================================

-- B1) Função principal de cálculo de Health Score
CREATE OR REPLACE FUNCTION public.calculate_objective_health(
  p_bu_id UUID,
  p_objective_type TEXT,
  p_objective_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kr_count INT := 0;
  v_active_kr_count INT := 0;
  v_kr_progress_avg NUMERIC := 0;
  v_confidence_score NUMERIC := 50;
  v_cadence_score NUMERIC := 50;
  v_kpi_trend_score NUMERIC := 50;
  v_initiatives_score NUMERIC := 0.5;
  v_stale_threshold INTERVAL := INTERVAL '14 days';
  v_final_score INT;
  v_health_status TEXT;
  v_kr RECORD;
  v_stale_count INT := 0;
  v_total_confidence NUMERIC := 0;
  v_checkin_count INT := 0;
  v_initiative_count INT := 0;
  v_completed_initiatives INT := 0;
  v_last_confidence TEXT;
BEGIN
  -- Buscar KRs do objetivo
  IF p_objective_type = 'org' THEN
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE cancelled_at IS NULL),
      AVG(
        CASE 
          WHEN direction = 'up' THEN
            CASE 
              WHEN target = baseline THEN CASE WHEN current_value >= target THEN 100 ELSE 0 END
              ELSE GREATEST(0, LEAST(100, ((current_value - baseline) / NULLIF(target - baseline, 0)) * 100))
            END
          ELSE
            CASE 
              WHEN baseline = target THEN CASE WHEN current_value <= target THEN 100 ELSE 0 END
              ELSE GREATEST(0, LEAST(100, ((baseline - current_value) / NULLIF(baseline - target, 0)) * 100))
            END
        END
      ) FILTER (WHERE cancelled_at IS NULL)
    INTO v_kr_count, v_active_kr_count, v_kr_progress_avg
    FROM public.okr_org_key_results
    WHERE org_objective_id = p_objective_id AND deleted_at IS NULL;
    
  ELSE -- team
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE cancelled_at IS NULL),
      AVG(
        CASE 
          WHEN direction = 'up' THEN
            CASE 
              WHEN target = baseline THEN CASE WHEN current_value >= target THEN 100 ELSE 0 END
              ELSE GREATEST(0, LEAST(100, ((current_value - baseline) / NULLIF(target - baseline, 0)) * 100))
            END
          ELSE
            CASE 
              WHEN baseline = target THEN CASE WHEN current_value <= target THEN 100 ELSE 0 END
              ELSE GREATEST(0, LEAST(100, ((baseline - current_value) / NULLIF(baseline - target, 0)) * 100))
            END
        END
      ) FILTER (WHERE cancelled_at IS NULL)
    INTO v_kr_count, v_active_kr_count, v_kr_progress_avg
    FROM public.okr_team_key_results
    WHERE team_objective_id = p_objective_id AND deleted_at IS NULL;
  END IF;

  -- Se não houver KRs ativos
  IF v_active_kr_count = 0 THEN
    v_final_score := 0;
    v_health_status := 'risk';
    
    RETURN jsonb_build_object(
      'score', v_final_score,
      'status', v_health_status,
      'components', jsonb_build_object(
        'progress', 0,
        'confidence', 0,
        'cadence', 0,
        'kpi_trend', 0,
        'initiatives_flow', 0
      ),
      'meta', jsonb_build_object(
        'computed_at', now(),
        'kr_count', v_kr_count,
        'active_kr_count', v_active_kr_count,
        'no_krs', true
      )
    );
  END IF;

  -- Calcular score de confiança e cadência baseado em check-ins
  IF p_objective_type = 'team' THEN
    FOR v_kr IN 
      SELECT id, last_checkin_at 
      FROM public.okr_team_key_results 
      WHERE team_objective_id = p_objective_id AND deleted_at IS NULL AND cancelled_at IS NULL
    LOOP
      -- Verificar cadência
      IF v_kr.last_checkin_at IS NULL OR v_kr.last_checkin_at < (now() - v_stale_threshold) THEN
        v_stale_count := v_stale_count + 1;
      END IF;
      
      -- Buscar último check-in para confidence
      SELECT confidence INTO v_last_confidence
      FROM public.okr_checkins
      WHERE kr_id = v_kr.id
      ORDER BY date DESC
      LIMIT 1;
      
      IF v_last_confidence IS NOT NULL THEN
        v_checkin_count := v_checkin_count + 1;
        v_total_confidence := v_total_confidence + 
          CASE v_last_confidence
            WHEN 'high' THEN 1.0
            WHEN 'medium' THEN 0.5
            ELSE 0.0
          END;
      END IF;
    END LOOP;
    
    -- Calcular scores
    IF v_checkin_count > 0 THEN
      v_confidence_score := (v_total_confidence / v_checkin_count) * 100;
    END IF;
    
    IF v_active_kr_count > 0 THEN
      v_cadence_score := ((v_active_kr_count - v_stale_count)::NUMERIC / v_active_kr_count) * 100;
    END IF;
    
    -- Iniciativas
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status IN ('completed', 'in_progress'))
    INTO v_initiative_count, v_completed_initiatives
    FROM public.okr_initiatives i
    INNER JOIN public.okr_team_key_results kr ON i.kr_id = kr.id
    WHERE kr.team_objective_id = p_objective_id AND i.deleted_at IS NULL;
    
    IF v_initiative_count > 0 THEN
      v_initiatives_score := v_completed_initiatives::NUMERIC / v_initiative_count;
    END IF;
  END IF;

  -- Calcular score final
  v_final_score := ROUND(
    (COALESCE(v_kr_progress_avg, 0) * 0.40) +
    (COALESCE(v_confidence_score, 50) * 0.20) +
    (COALESCE(v_cadence_score, 50) * 0.15) +
    (COALESCE(v_kpi_trend_score, 50) * 0.15) +
    (COALESCE(v_initiatives_score * 100, 50) * 0.10)
  )::INT;

  -- Determinar status
  v_health_status := CASE
    WHEN v_final_score >= 80 THEN 'healthy'
    WHEN v_final_score >= 60 THEN 'attention'
    ELSE 'risk'
  END;

  RETURN jsonb_build_object(
    'score', v_final_score,
    'status', v_health_status,
    'components', jsonb_build_object(
      'progress', ROUND(COALESCE(v_kr_progress_avg, 0)),
      'confidence', ROUND(COALESCE(v_confidence_score, 50)),
      'cadence', ROUND(COALESCE(v_cadence_score, 50)),
      'kpi_trend', ROUND(COALESCE(v_kpi_trend_score, 50)),
      'initiatives_flow', ROUND(COALESCE(v_initiatives_score * 100, 50))
    ),
    'meta', jsonb_build_object(
      'computed_at', now(),
      'kr_count', v_kr_count,
      'active_kr_count', v_active_kr_count,
      'stale_count', v_stale_count
    )
  );
END;
$$;

-- B2) Função para persistir health score
CREATE OR REPLACE FUNCTION public.refresh_objective_health(
  p_bu_id UUID,
  p_objective_type TEXT,
  p_objective_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_health JSONB;
BEGIN
  v_health := public.calculate_objective_health(p_bu_id, p_objective_type, p_objective_id);
  
  IF p_objective_type = 'org' THEN
    UPDATE public.okr_org_objectives
    SET 
      health_score = (v_health->>'score')::INT,
      health_status = v_health->>'status',
      last_health_calculated_at = now()
    WHERE id = p_objective_id;
  ELSE
    UPDATE public.okr_team_objectives
    SET 
      health_score = (v_health->>'score')::INT,
      health_status = v_health->>'status',
      last_health_calculated_at = now()
    WHERE id = p_objective_id;
  END IF;
END;
$$;

-- ==========================================================
-- C) FUNÇÕES DE INSIGHTS
-- ==========================================================

CREATE OR REPLACE FUNCTION public.generate_okr_insights_for_objective(
  p_bu_id UUID,
  p_objective_type TEXT,
  p_objective_id UUID
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_insights_count INT := 0;
  v_kr RECORD;
  v_kr_count INT := 0;
  v_no_primary_kpi_count INT := 0;
  v_stale_count INT := 0;
  v_stale_threshold INTERVAL := INTERVAL '14 days';
BEGIN
  -- Soft delete insights antigos para este scope
  UPDATE public.okr_insights
  SET deleted_at = now()
  WHERE scope_type = p_objective_type || '_objective'
    AND scope_id = p_objective_id
    AND source = 'rules'
    AND deleted_at IS NULL;

  -- Analisar KRs do objetivo
  IF p_objective_type = 'org' THEN
    SELECT COUNT(*) INTO v_kr_count
    FROM public.okr_org_key_results
    WHERE org_objective_id = p_objective_id AND deleted_at IS NULL AND cancelled_at IS NULL;
    
    IF v_kr_count = 0 THEN
      INSERT INTO public.okr_insights (bu_id, scope_type, scope_id, severity, code, title, message, suggested_actions, source)
      VALUES (
        p_bu_id,
        'org_objective',
        p_objective_id,
        'critical',
        'no_krs',
        'Objetivo sem Key Results',
        'Este objetivo não possui nenhum KR ativo.',
        '[{"label": "Criar KR", "type": "open_modal", "payload": {"modal": "create_kr"}}]'::JSONB,
        'rules'
      );
      v_insights_count := v_insights_count + 1;
    END IF;
    
  ELSE -- team
    SELECT COUNT(*) INTO v_kr_count
    FROM public.okr_team_key_results
    WHERE team_objective_id = p_objective_id AND deleted_at IS NULL AND cancelled_at IS NULL;
    
    IF v_kr_count = 0 THEN
      INSERT INTO public.okr_insights (bu_id, scope_type, scope_id, severity, code, title, message, suggested_actions, source)
      VALUES (
        p_bu_id,
        'team_objective',
        p_objective_id,
        'critical',
        'no_krs',
        'Objetivo sem Key Results',
        'Este objetivo não possui nenhum KR ativo.',
        '[{"label": "Criar KR", "type": "open_modal", "payload": {"modal": "create_kr"}}]'::JSONB,
        'rules'
      );
      v_insights_count := v_insights_count + 1;
    END IF;
    
    -- Verificar KRs individuais
    FOR v_kr IN 
      SELECT 
        tkr.id,
        tkr.title,
        tkr.last_checkin_at,
        (SELECT COUNT(*) FROM public.okr_kr_metrics WHERE kr_id = tkr.id AND kr_type = 'team' AND role = 'primary' AND deleted_at IS NULL) AS has_primary_kpi
      FROM public.okr_team_key_results tkr
      WHERE tkr.team_objective_id = p_objective_id AND tkr.deleted_at IS NULL AND tkr.cancelled_at IS NULL
    LOOP
      IF v_kr.has_primary_kpi = 0 THEN
        v_no_primary_kpi_count := v_no_primary_kpi_count + 1;
      END IF;
      
      IF v_kr.last_checkin_at IS NULL OR v_kr.last_checkin_at < (now() - v_stale_threshold) THEN
        v_stale_count := v_stale_count + 1;
        
        INSERT INTO public.okr_insights (bu_id, scope_type, scope_id, severity, code, title, message, suggested_actions, source)
        VALUES (
          p_bu_id,
          'team_kr',
          v_kr.id,
          'warning',
          'stale_checkins',
          'Check-in atrasado',
          'O KR "' || LEFT(v_kr.title, 50) || '" não recebe check-in há mais de 14 dias.',
          ('[{"label": "Fazer check-in", "type": "open_modal", "payload": {"modal": "checkin", "krId": "' || v_kr.id || '"}}]')::JSONB,
          'rules'
        );
        v_insights_count := v_insights_count + 1;
      END IF;
    END LOOP;
    
    -- Insight agregado se muitos check-ins atrasados
    IF v_stale_count > 0 AND v_kr_count > 0 AND (v_stale_count::NUMERIC / v_kr_count) >= 0.5 THEN
      INSERT INTO public.okr_insights (bu_id, scope_type, scope_id, severity, code, title, message, suggested_actions, source)
      VALUES (
        p_bu_id,
        'team_objective',
        p_objective_id,
        'critical',
        'many_stale_checkins',
        'Maioria dos KRs com check-in atrasado',
        v_stale_count || ' de ' || v_kr_count || ' KRs não recebem check-in há mais de 14 dias.',
        '[{"label": "Fazer check-ins", "type": "navigate", "payload": {"url": "/okrs"}}]'::JSONB,
        'rules'
      );
      v_insights_count := v_insights_count + 1;
    END IF;
  END IF;

  RETURN v_insights_count;
END;
$$;

-- ==========================================================
-- RLS para novas tabelas
-- ==========================================================

ALTER TABLE public.okr_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_coaching_events ENABLE ROW LEVEL SECURITY;

-- Policies para okr_insights
CREATE POLICY "okr_insights_select_bu" ON public.okr_insights
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR
    public.is_bu_admin(auth.uid(), bu_id) OR
    public.user_has_bu_access(auth.uid(), bu_id)
  );

CREATE POLICY "okr_insights_insert_system" ON public.okr_insights
  FOR INSERT WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    public.is_bu_admin(auth.uid(), bu_id)
  );

CREATE POLICY "okr_insights_update_manage" ON public.okr_insights
  FOR UPDATE USING (
    public.is_super_admin(auth.uid()) OR
    public.is_bu_admin(auth.uid(), bu_id) OR
    public.has_permission(auth.uid(), bu_id, 'okrs.insights.manage:bu')
  );

-- Policies para okr_coaching_events
CREATE POLICY "okr_coaching_events_select_own" ON public.okr_coaching_events
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.is_super_admin(auth.uid()) OR
    public.is_bu_admin(auth.uid(), bu_id)
  );

CREATE POLICY "okr_coaching_events_insert_own" ON public.okr_coaching_events
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    public.user_has_bu_access(auth.uid(), bu_id)
  );

-- ==========================================================
-- Permission Keys para OKRs vNext
-- ==========================================================

INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status)
VALUES 
  ('okrs.health.view:bu', 'okrs', 'health', 'view', 'bu', 'Visualizar health score de objetivos', 'active'),
  ('okrs.insights.view:bu', 'okrs', 'insights', 'view', 'bu', 'Visualizar insights de OKRs', 'active'),
  ('okrs.insights.manage:bu', 'okrs', 'insights', 'manage', 'bu', 'Gerenciar insights (marcar resolvido)', 'active'),
  ('okrs.coaching.view:bu', 'okrs', 'coaching', 'view', 'bu', 'Visualizar coaching de OKRs', 'active'),
  ('okrs.coaching.invoke:bu', 'okrs', 'coaching', 'invoke', 'bu', 'Invocar agentes de coaching', 'active')
ON CONFLICT (key) DO NOTHING;