-- Fix security definer views by explicitly setting SECURITY INVOKER
-- This ensures RLS policies of the querying user are respected

ALTER VIEW public.v_shared_okrs_summary SET (security_invoker = on);
ALTER VIEW public.v_team_contributed_okrs SET (security_invoker = on);