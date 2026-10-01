ALTER TABLE public.ritual_window_overrides ADD COLUMN IF NOT EXISTS profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE CASCADE;
COMMENT ON COLUMN public.ritual_window_overrides.profile_id IS 'Optional: when set, override applies only to this profile (early access). NULL = whole BU.';
CREATE OR REPLACE FUNCTION public.validate_ritual_window_override()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.closes_date < NEW.opens_date THEN
    RAISE EXCEPTION 'closes_date (%) must be >= opens_date (%)', NEW.closes_date, NEW.opens_date;
  END IF;
  IF NEW.wizard_type NOT IN ('mbr', 'mbr-pre', 'qbr-pre', 'qbr-pre-clevel', 'qbr-meeting', 'qbr-post') THEN
    RAISE EXCEPTION 'wizard_type % not supported', NEW.wizard_type;
  END IF;
  IF NEW.anchor NOT IN ('review_date', 'review_date_first_month', 'retro_date') THEN
    RAISE EXCEPTION 'anchor % not supported', NEW.anchor;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;