-- ============================================================
-- Onda 6 (Frente A): Sunset coluna legacy kpi_metrics.frequency
-- ============================================================
-- Pré-condições verificadas:
--   - 31/31 KPIs com consolidation_frequency e update_frequency preenchidos
--   - Frontend src/: zero referências
--   - Edge functions: hub-tools.ts já migrada (commit anterior)
--   - DB: única dependência = funções kpi_calculate_period + kpi_validate_value_insert
-- ============================================================

-- 1) Recriar kpi_calculate_period com kpi_frequency_value (superset)
CREATE OR REPLACE FUNCTION public.kpi_calculate_period(
  p_reference_date date,
  p_frequency kpi_frequency_value,
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
      p_start := p_reference_date;
      p_end := p_reference_date;
      p_label := to_char(p_reference_date, 'YYYY-MM-DD');
    WHEN 'weekly' THEN
      p_start := date_trunc('week', p_reference_date)::date;
      p_end := p_start + 6;
      p_label := to_char(p_start, 'IYYY-"W"IW');
    WHEN 'biweekly' THEN
      -- Bucket de 2 semanas a partir do início da semana ISO
      p_start := date_trunc('week', p_reference_date)::date;
      p_end := p_start + 13;
      p_label := to_char(p_start, 'IYYY-"W"IW') || '-2w';
    WHEN 'monthly' THEN
      p_start := date_trunc('month', p_reference_date)::date;
      p_end := (date_trunc('month', p_reference_date) + interval '1 month - 1 day')::date;
      p_label := to_char(p_reference_date, 'YYYY-MM');
    WHEN 'quarterly' THEN
      p_start := date_trunc('quarter', p_reference_date)::date;
      p_end := (date_trunc('quarter', p_reference_date) + interval '3 months - 1 day')::date;
      p_label := to_char(p_reference_date, 'YYYY-"Q"Q');
    WHEN 'semiannual' THEN
      IF EXTRACT(MONTH FROM p_reference_date) <= 6 THEN
        p_start := date_trunc('year', p_reference_date)::date;
        p_end := (date_trunc('year', p_reference_date) + interval '6 months - 1 day')::date;
        p_label := to_char(p_reference_date, 'YYYY') || '-H1';
      ELSE
        p_start := (date_trunc('year', p_reference_date) + interval '6 months')::date;
        p_end := (date_trunc('year', p_reference_date) + interval '1 year - 1 day')::date;
        p_label := to_char(p_reference_date, 'YYYY') || '-H2';
      END IF;
    WHEN 'annual' THEN
      p_start := date_trunc('year', p_reference_date)::date;
      p_end := (date_trunc('year', p_reference_date) + interval '1 year - 1 day')::date;
      p_label := to_char(p_reference_date, 'YYYY');
    ELSE
      p_start := p_reference_date;
      p_end := p_reference_date;
      p_label := to_char(p_reference_date, 'YYYY-MM-DD');
  END CASE;
END;
$function$;

-- 2) Drop versão antiga (assinatura com kpi_frequency)
DROP FUNCTION IF EXISTS public.kpi_calculate_period(date, kpi_frequency);

-- 3) Recriar kpi_validate_value_insert lendo consolidation_frequency
CREATE OR REPLACE FUNCTION public.kpi_validate_value_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_target_value numeric;
  v_direction kpi_direction;
  v_frequency kpi_frequency_value;
  v_period record;
BEGIN
  SELECT target_value, direction, COALESCE(consolidation_frequency, 'monthly'::kpi_frequency_value)
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
$function$;

-- 4) Drop coluna legacy
ALTER TABLE public.kpi_metrics DROP COLUMN IF EXISTS frequency;

-- 5) Drop enum legacy (agora sem dependentes)
DROP TYPE IF EXISTS public.kpi_frequency;