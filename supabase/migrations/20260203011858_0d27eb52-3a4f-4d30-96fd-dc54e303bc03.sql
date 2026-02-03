-- ============================================================
-- MIGRATION 1.1: Fix search_path for KPI functions (Security)
-- ============================================================

-- Fix search_path for kpi_calculate_rag
CREATE OR REPLACE FUNCTION public.kpi_calculate_rag(
  p_value numeric,
  p_target numeric,
  p_direction kpi_direction
) RETURNS kpi_rag_status AS $$
DECLARE
  v_percentage numeric;
BEGIN
  IF p_value IS NULL OR p_target IS NULL OR p_value = 0 OR p_target = 0 THEN
    RETURN 'no_data';
  END IF;
  
  IF p_direction = 'up' THEN
    v_percentage := (p_value / p_target) * 100;
  ELSE
    v_percentage := (p_target / p_value) * 100;
  END IF;
  
  IF v_percentage >= 90 THEN RETURN 'on_track'; END IF;
  IF v_percentage >= 70 THEN RETURN 'at_risk'; END IF;
  RETURN 'off_track';
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Fix search_path for kpi_calculate_period
CREATE OR REPLACE FUNCTION public.kpi_calculate_period(
  p_reference_date date,
  p_frequency kpi_frequency,
  OUT p_start date,
  OUT p_end date,
  OUT p_label text
) AS $$
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      p_start := p_reference_date;
      p_end := p_reference_date;
      p_label := to_char(p_reference_date, 'YYYY-MM-DD');
    WHEN 'weekly' THEN
      p_start := date_trunc('week', p_reference_date)::date;
      p_end := p_start + 6;
      p_label := to_char(p_start, 'IYYY-"W"IW');
    WHEN 'monthly' THEN
      p_start := date_trunc('month', p_reference_date)::date;
      p_end := (date_trunc('month', p_reference_date) + interval '1 month - 1 day')::date;
      p_label := to_char(p_reference_date, 'YYYY-MM');
    WHEN 'quarterly' THEN
      p_start := date_trunc('quarter', p_reference_date)::date;
      p_end := (date_trunc('quarter', p_reference_date) + interval '3 months - 1 day')::date;
      p_label := to_char(p_reference_date, 'YYYY-"Q"Q');
    ELSE
      p_start := p_reference_date;
      p_end := p_reference_date;
      p_label := to_char(p_reference_date, 'YYYY-MM-DD');
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Fix search_path for kpi_validate_value_insert
CREATE OR REPLACE FUNCTION public.kpi_validate_value_insert()
RETURNS trigger AS $$
DECLARE
  v_target_value numeric;
  v_direction kpi_direction;
  v_frequency kpi_frequency;
  v_period record;
BEGIN
  SELECT target_value, direction, frequency 
  INTO v_target_value, v_direction, v_frequency
  FROM public.kpi_metrics 
  WHERE id = NEW.kpi_id;
  
  IF NEW.period_start IS NULL OR NEW.period_end IS NULL OR NEW.period_label IS NULL THEN
    SELECT * INTO v_period FROM public.kpi_calculate_period(NEW.reference_date, v_frequency);
    NEW.period_start := COALESCE(NEW.period_start, v_period.p_start);
    NEW.period_end := COALESCE(NEW.period_end, v_period.p_end);
    NEW.period_label := COALESCE(NEW.period_label, v_period.p_label);
  END IF;
  
  NEW.rag_status := public.kpi_calculate_rag(NEW.value, v_target_value, v_direction);
  
  IF NEW.rag_status IN ('at_risk', 'off_track') 
     AND (NEW.notes IS NULL OR trim(NEW.notes) = '') THEN
    RAISE EXCEPTION 'Comentário obrigatório para KPIs amarelos ou vermelhos';
  END IF;
  
  IF NEW.confidence IS NULL THEN
    NEW.confidence := CASE 
      WHEN NEW.source IS NULL THEN 'medium'::kpi_confidence_level
      WHEN NEW.source = 'manual' THEN 'medium'::kpi_confidence_level
      ELSE 'high'::kpi_confidence_level
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- MIGRATION 2: KPI Evolution v2.1 - Performance Indexes
-- ============================================================

-- kpi_metrics (TEM deleted_at)
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_bu_status 
ON public.kpi_metrics (bu_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_owner 
ON public.kpi_metrics (owner_user_id, status) 
WHERE deleted_at IS NULL AND owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_team 
ON public.kpi_metrics (team_id, status) 
WHERE deleted_at IS NULL AND team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_category_bu 
ON public.kpi_metrics (bu_id, category, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_lifecycle 
ON public.kpi_metrics (bu_id, lifecycle_status) 
WHERE deleted_at IS NULL;

-- kpi_values (NÃO TEM deleted_at)
CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi_date_desc 
ON public.kpi_values (kpi_id, reference_date DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi_period 
ON public.kpi_values (kpi_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_kpi_values_rag_alerts 
ON public.kpi_values (kpi_id, rag_status) 
WHERE rag_status IN ('at_risk', 'off_track');

CREATE INDEX IF NOT EXISTS idx_kpi_values_created_by 
ON public.kpi_values (created_by, created_at DESC) 
WHERE created_by IS NOT NULL;

-- okr_kr_metrics (para vínculo KR ↔ KPI)
CREATE INDEX IF NOT EXISTS idx_okr_kr_metrics_kpi 
ON public.okr_kr_metrics (kpi_id, role) 
WHERE deleted_at IS NULL;