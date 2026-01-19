-- Fix: ai_agents SELECT should require manage permission for sensitive fields
-- Only users with AI management permission should see full agent config
-- Others should use v_ai_agents_public for basic metadata

-- Drop current V2 SELECT policy
DROP POLICY IF EXISTS "ai_agents_select_v2" ON public.ai_agents;
DROP POLICY IF EXISTS "ai_agents_select" ON public.ai_agents;

-- Create restricted SELECT policy:
-- Only platform admins OR users with explicit AI management permission can see full config
CREATE POLICY "ai_agents_select_v2" ON public.ai_agents
FOR SELECT TO authenticated
USING (
  -- Platform admins always see everything
  public.is_platform_admin(auth.uid())
  -- Users with AI management permission can see agents in their BU
  OR (
    scope = 'bu'::agent_scope 
    AND public.has_permission(public.my_profile_id(), bu_id, 'settings.ai.manage:bu')
  )
);

-- Update the public view to be more permissive for basic listings
-- This is safe because it doesn't expose sensitive fields
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
  a.integration_key,
  a.created_at,
  a.updated_at
FROM public.ai_agents a
WHERE 
  -- Platform admins see all
  public.is_platform_admin(auth.uid())
  -- BU members see basic info of their BU agents
  OR (a.scope = 'bu'::agent_scope AND public.is_profile_bu_member(public.my_profile_id(), a.bu_id))
  -- Everyone sees basic info of active global agents
  OR (a.scope = 'global'::agent_scope AND a.is_active = true);

-- Ensure proper grants
GRANT SELECT ON public.v_ai_agents_public TO authenticated;

-- Update comment explaining security model
COMMENT ON VIEW public.v_ai_agents_public IS 
'Public view of AI agents with non-sensitive metadata only. 
Does NOT expose: system_prompt, allowed_tools, model_name, temperature, max_tokens, output_schema.
Includes: id, name, slug, description, scope, bu_id, is_active, output_format, integration_key, created_at, updated_at.
Use this view for UI listings. Full agent config via ai_agents table requires settings.ai.manage:bu permission.';