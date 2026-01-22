-- Fix security linter: ensure view runs with invoker privileges
ALTER VIEW public.v_teams_clean SET (security_invoker = true);
