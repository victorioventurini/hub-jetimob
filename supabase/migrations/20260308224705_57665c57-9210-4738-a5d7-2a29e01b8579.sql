
-- Fix search_path for new functions
CREATE OR REPLACE FUNCTION public.validate_phone_line_loan()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'loaned' AND NEW.current_user_id IS NULL THEN
    RAISE EXCEPTION 'current_user_id is required when status is loaned';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_asset_phone_lines_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;
