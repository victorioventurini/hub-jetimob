CREATE OR REPLACE FUNCTION public.fn_attendance_touch_modified()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.last_modified_at := now();
  RETURN NEW;
END;
$$;