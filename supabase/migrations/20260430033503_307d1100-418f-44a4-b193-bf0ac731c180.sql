CREATE TYPE public.kpi_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');

ALTER TABLE public.kpi_metrics
  ADD COLUMN frequency public.kpi_frequency NOT NULL DEFAULT 'monthly'::public.kpi_frequency;

-- Backfill com triggers desabilitados (UPDATE administrativo, sem contexto BU)
ALTER TABLE public.kpi_metrics DISABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;
ALTER TABLE public.kpi_metrics DISABLE TRIGGER kpi_metrics_audit;
ALTER TABLE public.kpi_metrics DISABLE TRIGGER trg_kpi_target_history;
ALTER TABLE public.kpi_metrics DISABLE TRIGGER trg_kpi_metrics_governance;
ALTER TABLE public.kpi_metrics DISABLE TRIGGER trg_enforce_metric_scope_team;

UPDATE public.kpi_metrics
SET frequency = CASE
  WHEN consolidation_frequency = 'daily'      THEN 'daily'::public.kpi_frequency
  WHEN consolidation_frequency = 'weekly'     THEN 'weekly'::public.kpi_frequency
  WHEN consolidation_frequency = 'biweekly'   THEN 'weekly'::public.kpi_frequency
  WHEN consolidation_frequency = 'monthly'    THEN 'monthly'::public.kpi_frequency
  WHEN consolidation_frequency = 'quarterly'  THEN 'quarterly'::public.kpi_frequency
  WHEN consolidation_frequency = 'semiannual' THEN 'quarterly'::public.kpi_frequency
  WHEN consolidation_frequency = 'annual'     THEN 'quarterly'::public.kpi_frequency
  ELSE 'monthly'::public.kpi_frequency
END;

ALTER TABLE public.kpi_metrics ENABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;
ALTER TABLE public.kpi_metrics ENABLE TRIGGER kpi_metrics_audit;
ALTER TABLE public.kpi_metrics ENABLE TRIGGER trg_kpi_target_history;
ALTER TABLE public.kpi_metrics ENABLE TRIGGER trg_kpi_metrics_governance;
ALTER TABLE public.kpi_metrics ENABLE TRIGGER trg_enforce_metric_scope_team;

DROP FUNCTION IF EXISTS public.kpi_calculate_period(date, kpi_frequency_value);

CREATE OR REPLACE FUNCTION public.kpi_calculate_period(
  p_reference_date date,
  p_frequency kpi_frequency,
  OUT p_start date,
  OUT p_end date,
  OUT p_label text
)
RETURNS record
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      p_start := p_reference_date; p_end := p_reference_date;
      p_label := to_char(p_reference_date, 'YYYY-MM-DD');
    WHEN 'weekly' THEN
      p_start := date_trunc('week', p_reference_date)::date; p_end := p_start + 6;
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
      p_start := p_reference_date; p_end := p_reference_date;
      p_label := to_char(p_reference_date, 'YYYY-MM-DD');
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.kpi_validate_value_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_target_value numeric;
  v_direction kpi_direction;
  v_frequency kpi_frequency;
  v_period record;
BEGIN
  SELECT target_value, direction, frequency
  INTO v_target_value, v_direction, v_frequency
  FROM public.kpi_metrics WHERE id = NEW.kpi_id;

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
$function$;