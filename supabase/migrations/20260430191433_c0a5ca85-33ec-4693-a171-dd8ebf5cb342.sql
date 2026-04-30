-- 1) Drop trigger first
DROP TRIGGER IF EXISTS trg_kpi_value_derive_confidence ON public.kpi_values;

-- 2) Drop the trigger function
DROP FUNCTION IF EXISTS public.derive_kpi_value_confidence();

-- 3) Drop the confidence column from kpi_values
ALTER TABLE public.kpi_values
  DROP COLUMN IF EXISTS confidence;

-- 4) Drop the enum type now that nothing references it
DROP TYPE IF EXISTS public.kpi_confidence_level;