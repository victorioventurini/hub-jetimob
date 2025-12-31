-- Fix search_path for OKR functions
ALTER FUNCTION public.calculate_kr_progress(NUMERIC, NUMERIC, NUMERIC, okr_direction) SET search_path = public;