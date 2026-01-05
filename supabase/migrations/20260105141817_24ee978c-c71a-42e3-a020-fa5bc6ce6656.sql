-- Fix function search_path for bu_locations triggers
ALTER FUNCTION public.trg_bu_locations_updated_at() SET search_path = public;
ALTER FUNCTION public.trg_bu_locations_ensure_single_default() SET search_path = public;
ALTER FUNCTION public.trg_bu_locations_audit() SET search_path = public;