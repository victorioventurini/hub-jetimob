-- 1) Migrar duplicados existentes: manter o mais recente como consolidated, converter anteriores em partial
WITH ranked AS (
  SELECT id, kpi_id, period_start, created_at,
         ROW_NUMBER() OVER (PARTITION BY kpi_id, period_start ORDER BY created_at DESC) AS rn
  FROM public.kpi_values
  WHERE input_type = 'consolidated' AND period_start IS NOT NULL
)
UPDATE public.kpi_values v
SET input_type = 'partial',
    notes = COALESCE(NULLIF(trim(v.notes), '') || E'\n', '') || '[auto-migrated:duplicate-consolidated 2026-05-04]'
FROM ranked r
WHERE v.id = r.id AND r.rn > 1;

-- 2) Índice único parcial: 1 consolidated por (kpi_id, period_start)
CREATE UNIQUE INDEX IF NOT EXISTS kpi_values_one_consolidated_per_period
  ON public.kpi_values (kpi_id, period_start)
  WHERE input_type = 'consolidated';

-- 3) Trigger amigável: detectar conflito antes do unique violation, com hint estruturado
CREATE OR REPLACE FUNCTION public.kpi_validate_value_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_target_value numeric;
  v_direction public.kpi_direction;
  v_frequency public.kpi_frequency;
  v_period record;
  v_conflict_id uuid;
BEGIN
  SELECT target_value, direction, frequency
  INTO v_target_value, v_direction, v_frequency
  FROM public.kpi_metrics
  WHERE id = NEW.kpi_id;

  SELECT * INTO v_period
  FROM public.kpi_calculate_period(NEW.reference_date, v_frequency);

  NEW.period_start := v_period.p_start;
  NEW.period_end := v_period.p_end;
  NEW.period_label := v_period.p_label;
  NEW.rag_status := public.kpi_calculate_rag(NEW.value, v_target_value, v_direction);

  IF NEW.rag_status IN ('at_risk', 'off_track')
     AND (NEW.notes IS NULL OR trim(NEW.notes) = '') THEN
    RAISE EXCEPTION 'Comentário obrigatório para KPIs amarelos ou vermelhos';
  END IF;

  -- Garantir 1 consolidado por período por KPI (mensagem amigável antes do unique violation)
  IF NEW.input_type = 'consolidated' THEN
    SELECT id INTO v_conflict_id
    FROM public.kpi_values
    WHERE kpi_id = NEW.kpi_id
      AND period_start = NEW.period_start
      AND input_type = 'consolidated'
      AND id <> NEW.id
    LIMIT 1;

    IF v_conflict_id IS NOT NULL THEN
      RAISE EXCEPTION 'Já existe um valor consolidado para este período neste KPI.'
        USING ERRCODE = '23505',
              HINT = 'kpi_consolidated_period_conflict:' || v_conflict_id::text;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;