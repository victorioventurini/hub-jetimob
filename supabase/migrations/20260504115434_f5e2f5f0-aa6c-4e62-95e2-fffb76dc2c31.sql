DROP TRIGGER IF EXISTS trg_kpi_value_derive_confidence ON public.kpi_values;
DROP FUNCTION IF EXISTS public.derive_kpi_value_confidence();

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
BEGIN
  SELECT target_value, direction, frequency
  INTO v_target_value, v_direction, v_frequency
  FROM public.kpi_metrics
  WHERE id = NEW.kpi_id;

  IF NEW.period_start IS NULL OR NEW.period_end IS NULL OR NEW.period_label IS NULL THEN
    SELECT * INTO v_period
    FROM public.kpi_calculate_period(NEW.reference_date, v_frequency);

    NEW.period_start := COALESCE(NEW.period_start, v_period.p_start);
    NEW.period_end := COALESCE(NEW.period_end, v_period.p_end);
    NEW.period_label := COALESCE(NEW.period_label, v_period.p_label);
  END IF;

  NEW.rag_status := public.kpi_calculate_rag(NEW.value, v_target_value, v_direction);

  IF NEW.rag_status IN ('at_risk', 'off_track')
     AND (NEW.notes IS NULL OR trim(NEW.notes) = '') THEN
    RAISE EXCEPTION 'Comentário obrigatório para KPIs amarelos ou vermelhos';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_kpi_value_validation ON public.kpi_values;
CREATE TRIGGER trg_kpi_value_validation
BEFORE INSERT ON public.kpi_values
FOR EACH ROW
EXECUTE FUNCTION public.kpi_validate_value_insert();