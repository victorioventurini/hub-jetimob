-- Corrigir função tickets_updated_at para ter search_path definido
CREATE OR REPLACE FUNCTION public.tickets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;