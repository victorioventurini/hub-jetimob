-- =====================================================================
-- KPIs Refactor — Phase 1 (v4 final): Schema + safe backfill via DISABLE TRIGGER
-- =====================================================================

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE public.kpi_frequency_value AS ENUM
    ('daily','weekly','biweekly','monthly','quarterly','semiannual','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.kpi_update_mode AS ENUM ('manual','automatic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.kpi_input_type AS ENUM ('projection','consolidated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. NEW COLUMNS — kpi_metrics
ALTER TABLE public.kpi_metrics
  ADD COLUMN IF NOT EXISTS consolidation_frequency public.kpi_frequency_value,
  ADD COLUMN IF NOT EXISTS update_frequency        public.kpi_frequency_value,
  ADD COLUMN IF NOT EXISTS update_mode             public.kpi_update_mode NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS frequency_migration_reviewed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.kpi_metrics.frequency IS
  'DEPRECATED: use consolidation_frequency + update_frequency.';
COMMENT ON COLUMN public.kpi_metrics.consolidation_frequency IS
  'Frequência de consolidação — a cada quanto tempo o indicador tem valor fechado.';
COMMENT ON COLUMN public.kpi_metrics.update_frequency IS
  'Frequência de atualização — periodicidade em que o valor é alimentado no Hub.';
COMMENT ON COLUMN public.kpi_metrics.update_mode IS
  'Modo de atualização: manual (default) ou automatic.';
COMMENT ON COLUMN public.kpi_metrics.frequency_migration_reviewed IS
  'Flag temporária — admin já revisou os campos migrados?';

-- 3. NEW COLUMN — kpi_values
ALTER TABLE public.kpi_values
  ADD COLUMN IF NOT EXISTS input_type public.kpi_input_type NOT NULL DEFAULT 'consolidated';

COMMENT ON COLUMN public.kpi_values.input_type IS
  'Distingue input intermediário (projection) de input final (consolidated).';

-- 4. HELPER: frequency value -> days
CREATE OR REPLACE FUNCTION public.kpi_frequency_to_days(f public.kpi_frequency_value)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE f
    WHEN 'daily' THEN 1 WHEN 'weekly' THEN 7 WHEN 'biweekly' THEN 14
    WHEN 'monthly' THEN 30 WHEN 'quarterly' THEN 90
    WHEN 'semiannual' THEN 180 WHEN 'annual' THEN 365
  END;
$$;

-- 5. TRIGGER: cross-validate consolidation vs update frequency
CREATE OR REPLACE FUNCTION public.validate_kpi_frequency_relationship()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.consolidation_frequency IS NOT NULL
     AND NEW.update_frequency IS NOT NULL
     AND public.kpi_frequency_to_days(NEW.update_frequency)
       > public.kpi_frequency_to_days(NEW.consolidation_frequency) THEN
    RAISE EXCEPTION
      'update_frequency (%) cannot be less frequent than consolidation_frequency (%)',
      NEW.update_frequency, NEW.consolidation_frequency;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS kpi_frequency_validation ON public.kpi_metrics;
CREATE TRIGGER kpi_frequency_validation
BEFORE INSERT OR UPDATE OF consolidation_frequency, update_frequency ON public.kpi_metrics
FOR EACH ROW EXECUTE FUNCTION public.validate_kpi_frequency_relationship();

-- 6. kpi_calculate_period_v2 — 7-frequency overload
CREATE OR REPLACE FUNCTION public.kpi_calculate_period_v2(
  p_reference_date date,
  p_frequency public.kpi_frequency_value,
  OUT p_start date,
  OUT p_end date,
  OUT p_label text
)
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_year_start date;
  v_first_monday date;
  v_days_since int;
  v_window_index int;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      p_start := p_reference_date;
      p_end   := p_reference_date;
      p_label := to_char(p_reference_date, 'DD/MM/YYYY');
    WHEN 'weekly' THEN
      p_start := date_trunc('week', p_reference_date)::date;
      p_end   := (p_start + interval '6 days')::date;
      p_label := 'Sem ' || to_char(p_start, 'IW/IYYY');
    WHEN 'biweekly' THEN
      v_year_start := date_trunc('year', p_reference_date)::date;
      v_first_monday := date_trunc('week', v_year_start)::date;
      IF v_first_monday < v_year_start THEN
        v_first_monday := v_first_monday + 7;
      END IF;
      v_days_since := (p_reference_date - v_first_monday);
      v_window_index := FLOOR(v_days_since / 14.0)::int;
      p_start := v_first_monday + (v_window_index * 14);
      p_end   := p_start + 13;
      p_label := 'Quinz ' || (v_window_index + 1) || '/' || to_char(p_reference_date, 'YYYY');
    WHEN 'monthly' THEN
      p_start := date_trunc('month', p_reference_date)::date;
      p_end   := (date_trunc('month', p_reference_date) + interval '1 month - 1 day')::date;
      p_label := to_char(p_reference_date, 'MM/YYYY');
    WHEN 'quarterly' THEN
      p_start := date_trunc('quarter', p_reference_date)::date;
      p_end   := (date_trunc('quarter', p_reference_date) + interval '3 months - 1 day')::date;
      p_label := 'Q' || to_char(p_reference_date, 'Q/YYYY');
    WHEN 'semiannual' THEN
      IF EXTRACT(MONTH FROM p_reference_date) <= 6 THEN
        p_start := make_date(EXTRACT(YEAR FROM p_reference_date)::int, 1, 1);
        p_end   := make_date(EXTRACT(YEAR FROM p_reference_date)::int, 6, 30);
        p_label := 'H1/' || to_char(p_reference_date, 'YYYY');
      ELSE
        p_start := make_date(EXTRACT(YEAR FROM p_reference_date)::int, 7, 1);
        p_end   := make_date(EXTRACT(YEAR FROM p_reference_date)::int, 12, 31);
        p_label := 'H2/' || to_char(p_reference_date, 'YYYY');
      END IF;
    WHEN 'annual' THEN
      p_start := date_trunc('year', p_reference_date)::date;
      p_end   := (date_trunc('year', p_reference_date) + interval '1 year - 1 day')::date;
      p_label := to_char(p_reference_date, 'YYYY');
  END CASE;
END $$;

COMMENT ON FUNCTION public.kpi_calculate_period_v2(date, public.kpi_frequency_value) IS
  'Calcula período (start/end/label) para qualquer cadência da nova taxonomia (7 valores).';

-- 7. TRIGGER: derive confidence from input_type when not explicitly set
CREATE OR REPLACE FUNCTION public.derive_kpi_value_confidence()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.confidence = 'medium' THEN
    IF NEW.input_type = 'consolidated' THEN
      NEW.confidence := 'high'::public.kpi_confidence_level;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_kpi_value_derive_confidence ON public.kpi_values;
CREATE TRIGGER trg_kpi_value_derive_confidence
BEFORE INSERT ON public.kpi_values
FOR EACH ROW EXECUTE FUNCTION public.derive_kpi_value_confidence();

-- 8. BACKFILL — temporarily disable BU scope trigger (safe: bu_id not modified)
ALTER TABLE public.kpi_metrics DISABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;
ALTER TABLE public.kpi_metrics DISABLE TRIGGER trg_kpi_metrics_governance;

UPDATE public.kpi_metrics
SET
  consolidation_frequency = CASE frequency::text
    WHEN 'daily'     THEN 'daily'::public.kpi_frequency_value
    WHEN 'weekly'    THEN 'weekly'::public.kpi_frequency_value
    WHEN 'monthly'   THEN 'monthly'::public.kpi_frequency_value
    WHEN 'quarterly' THEN 'quarterly'::public.kpi_frequency_value
    ELSE NULL
  END,
  update_frequency = CASE frequency::text
    WHEN 'daily'     THEN 'daily'::public.kpi_frequency_value
    WHEN 'weekly'    THEN 'weekly'::public.kpi_frequency_value
    WHEN 'monthly'   THEN 'monthly'::public.kpi_frequency_value
    WHEN 'quarterly' THEN 'quarterly'::public.kpi_frequency_value
    ELSE NULL
  END,
  update_mode = 'manual',
  frequency_migration_reviewed = false
WHERE consolidation_frequency IS NULL AND update_frequency IS NULL;

ALTER TABLE public.kpi_metrics ENABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;
ALTER TABLE public.kpi_metrics ENABLE TRIGGER trg_kpi_metrics_governance;