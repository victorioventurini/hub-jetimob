-- Drop CHECK constraints (padrão canônico: validação via trigger)
ALTER TABLE public.assessment_categories
  DROP CONSTRAINT IF EXISTS assessment_categories_name_length;

ALTER TABLE public.assessment_subcategories
  DROP CONSTRAINT IF EXISTS assessment_subcategories_name_length;

-- Validation trigger function: limita name a 1..120 chars
CREATE OR REPLACE FUNCTION public.assessment_category_validate_name_length()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.name IS NULL OR char_length(btrim(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'INVALID_NAME: name is required';
  END IF;
  IF char_length(NEW.name) > 120 THEN
    RAISE EXCEPTION 'INVALID_NAME_LENGTH: name must be at most 120 characters (got %)', char_length(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessment_categories_name_length ON public.assessment_categories;
CREATE TRIGGER trg_assessment_categories_name_length
  BEFORE INSERT OR UPDATE OF name ON public.assessment_categories
  FOR EACH ROW EXECUTE FUNCTION public.assessment_category_validate_name_length();

DROP TRIGGER IF EXISTS trg_assessment_subcategories_name_length ON public.assessment_subcategories;
CREATE TRIGGER trg_assessment_subcategories_name_length
  BEFORE INSERT OR UPDATE OF name ON public.assessment_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.assessment_category_validate_name_length();