-- Fix: ai_agents global agents should not expose system_prompt to all users
-- Only admins should see full global agent configuration

-- Drop current overly permissive SELECT policy
DROP POLICY IF EXISTS "ai_agents_select" ON public.ai_agents;

-- Create restricted SELECT policy:
-- 1. Platform admins can see all agents
-- 2. BU members can see agents in their BU
-- 3. Regular users cannot see global agents directly (use view for public metadata)
CREATE POLICY "ai_agents_select" ON public.ai_agents
FOR SELECT USING (
  -- Platform admins can see everything
  public.is_platform_admin(auth.uid())
  -- BU-scoped agents visible to BU members
  OR (scope = 'bu'::agent_scope AND public.is_profile_bu_member(public.my_profile_id(), bu_id))
);

-- Create a public view with non-sensitive metadata for global agents
-- This allows UI to show agent names/descriptions without exposing system_prompt
DROP VIEW IF EXISTS public.v_ai_agents_public;
CREATE VIEW public.v_ai_agents_public
WITH (security_invoker = true)
AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.description,
  a.scope,
  a.bu_id,
  a.is_active,
  a.output_format,
  a.created_at,
  a.updated_at
FROM public.ai_agents a
WHERE 
  -- Platform admins see all
  public.is_platform_admin(auth.uid())
  -- BU members see their BU agents
  OR (a.scope = 'bu'::agent_scope AND public.is_profile_bu_member(public.my_profile_id(), a.bu_id))
  -- Everyone sees basic info of active global agents (but NOT through base table)
  OR (a.scope = 'global'::agent_scope AND a.is_active = true);

-- Grant access to the view
GRANT SELECT ON public.v_ai_agents_public TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.v_ai_agents_public IS 
'Public view of AI agents with non-sensitive metadata only. 
Does NOT expose: system_prompt, allowed_tools, model_name, temperature, max_tokens, integration_key.
Use this view for UI listings. Only admins can access full agent config via ai_agents table.';