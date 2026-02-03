-- ============================================================
-- MIGRATION 1: KPI Evolution v2.1 - Schema + Trigger + Backfill
-- ============================================================

-- ========================
-- 1. Novos Enums (Idempotente)
-- ========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_indicator_type') THEN
    CREATE TYPE kpi_indicator_type AS ENUM ('kpi', 'metric', 'health_indicator');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_lifecycle_status') THEN
    CREATE TYPE kpi_lifecycle_status AS ENUM ('proposed', 'active', 'observing', 'deprecated');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_confidence_level') THEN
    CREATE TYPE kpi_confidence_level AS ENUM ('high', 'medium', 'low');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_rag_status') THEN
    CREATE TYPE kpi_rag_status AS ENUM ('on_track', 'at_risk', 'off_track', 'no_data');
  END IF;
END$$;

-- ========================
-- 2. Expandir enum kpi_value_source (Idempotente)
-- ========================
DO $$
BEGIN
  ALTER TYPE kpi_value_source ADD VALUE 'api';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE kpi_value_source ADD VALUE 'webhook';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE kpi_value_source ADD VALUE 'spreadsheet';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE kpi_value_source ADD VALUE 'database';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- ========================
-- 3. Novas colunas em kpi_metrics (Idempotente)
-- ========================
ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS indicator_type kpi_indicator_type NOT NULL DEFAULT 'kpi';

ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS lifecycle_status kpi_lifecycle_status NOT NULL DEFAULT 'active';

ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS target_source text;

ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS recovery_protocol text;

-- ========================
-- 4. Novas colunas em kpi_values (Idempotente)
-- ========================
ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS period_start date;

ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS period_end date;

ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS period_label text;

ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS confidence kpi_confidence_level NOT NULL DEFAULT 'medium';

ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS rag_status kpi_rag_status;

-- ========================
-- 5. Função de cálculo RAG (Reutilizável, corrigida para divisão por zero)
-- ========================
CREATE OR REPLACE FUNCTION kpi_calculate_rag(
  p_value numeric,
  p_target numeric,
  p_direction kpi_direction
) RETURNS kpi_rag_status AS $$
DECLARE
  v_percentage numeric;
BEGIN
  -- Tratar NULL e zero (divisão por zero)
  IF p_value IS NULL OR p_target IS NULL OR p_value = 0 OR p_target = 0 THEN
    RETURN 'no_data';
  END IF;
  
  -- Calcular percentual baseado na direção
  IF p_direction = 'up' THEN
    v_percentage := (p_value / p_target) * 100;
  ELSE
    v_percentage := (p_target / p_value) * 100;
  END IF;
  
  -- Aplicar thresholds (idênticos ao frontend types.ts)
  IF v_percentage >= 90 THEN RETURN 'on_track'; END IF;
  IF v_percentage >= 70 THEN RETURN 'at_risk'; END IF;
  RETURN 'off_track';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================
-- 6. Função auxiliar para calcular período (ISO week aligned)
-- ========================
CREATE OR REPLACE FUNCTION kpi_calculate_period(
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
      -- ISO week: segunda-feira como início
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================
-- 7. Trigger de validação (calcula período, RAG, gate de comentário)
-- ========================
CREATE OR REPLACE FUNCTION kpi_validate_value_insert()
RETURNS trigger AS $$
DECLARE
  v_target_value numeric;
  v_direction kpi_direction;
  v_frequency kpi_frequency;
  v_period record;
BEGIN
  -- Buscar metadados do KPI
  SELECT target_value, direction, frequency 
  INTO v_target_value, v_direction, v_frequency
  FROM public.kpi_metrics 
  WHERE id = NEW.kpi_id;
  
  -- 1. Preencher período se veio NULL
  IF NEW.period_start IS NULL OR NEW.period_end IS NULL OR NEW.period_label IS NULL THEN
    SELECT * INTO v_period FROM kpi_calculate_period(NEW.reference_date, v_frequency);
    NEW.period_start := COALESCE(NEW.period_start, v_period.p_start);
    NEW.period_end := COALESCE(NEW.period_end, v_period.p_end);
    NEW.period_label := COALESCE(NEW.period_label, v_period.p_label);
  END IF;
  
  -- 2. Calcular RAG status sempre
  NEW.rag_status := kpi_calculate_rag(NEW.value, v_target_value, v_direction);
  
  -- 3. Gate: comentário obrigatório se fora da meta
  IF NEW.rag_status IN ('at_risk', 'off_track') 
     AND (NEW.notes IS NULL OR trim(NEW.notes) = '') THEN
    RAISE EXCEPTION 'Comentário obrigatório para KPIs amarelos ou vermelhos';
  END IF;
  
  -- 4. Default confidence (NULL-safe para source)
  IF NEW.confidence IS NULL THEN
    NEW.confidence := CASE 
      WHEN NEW.source IS NULL THEN 'medium'::kpi_confidence_level
      WHEN NEW.source = 'manual' THEN 'medium'::kpi_confidence_level
      ELSE 'high'::kpi_confidence_level
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kpi_value_validation ON public.kpi_values;
CREATE TRIGGER trg_kpi_value_validation
BEFORE INSERT OR UPDATE ON public.kpi_values
FOR EACH ROW EXECUTE FUNCTION kpi_validate_value_insert();

-- ========================
-- 8. Backfill: Período (alinhado ao início ISO)
-- ========================
UPDATE public.kpi_values v SET
  period_start = (SELECT p_start FROM kpi_calculate_period(v.reference_date, m.frequency)),
  period_end = (SELECT p_end FROM kpi_calculate_period(v.reference_date, m.frequency)),
  period_label = (SELECT p_label FROM kpi_calculate_period(v.reference_date, m.frequency))
FROM public.kpi_metrics m
WHERE v.kpi_id = m.id 
  AND v.period_start IS NULL;

-- ========================
-- 9. Backfill: RAG status
-- ========================
UPDATE public.kpi_values v SET
  rag_status = kpi_calculate_rag(v.value, m.target_value, m.direction)
FROM public.kpi_metrics m
WHERE v.kpi_id = m.id 
  AND v.rag_status IS NULL;

-- ========================
-- 10. Backfill: Confidence (NULL-safe com cast explícito)
-- ========================
UPDATE public.kpi_values SET 
  confidence = CASE 
    WHEN source IS NULL THEN 'medium'::kpi_confidence_level
    WHEN source = 'manual' THEN 'medium'::kpi_confidence_level
    ELSE 'high'::kpi_confidence_level
  END
WHERE confidence IS NULL;

-- ========================
-- 11. Índice de Unicidade por Período
-- ========================
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_values_unique_period 
ON public.kpi_values (kpi_id, period_start, period_end) 
WHERE period_start IS NOT NULL AND period_end IS NOT NULL;

-- ========================
-- 12. Comentário de documentação
-- ========================
COMMENT ON COLUMN public.kpi_metrics.indicator_type IS 'Tipo do indicador: kpi, metric, health_indicator';
COMMENT ON COLUMN public.kpi_metrics.lifecycle_status IS 'Ciclo de vida: proposed, active, observing, deprecated';
COMMENT ON COLUMN public.kpi_metrics.target_source IS 'Fonte/URL do target/benchmark';
COMMENT ON COLUMN public.kpi_metrics.recovery_protocol IS 'Protocolo de recuperação quando fora da meta';
COMMENT ON COLUMN public.kpi_values.period_start IS 'Início do período (ISO week aligned)';
COMMENT ON COLUMN public.kpi_values.period_end IS 'Fim do período';
COMMENT ON COLUMN public.kpi_values.period_label IS 'Label do período: YYYY-MM-DD, IYYY-WIW, YYYY-MM, YYYY-QQ';
COMMENT ON COLUMN public.kpi_values.confidence IS 'Nível de confiança do dado';
COMMENT ON COLUMN public.kpi_values.rag_status IS 'Status RAG calculado automaticamente';