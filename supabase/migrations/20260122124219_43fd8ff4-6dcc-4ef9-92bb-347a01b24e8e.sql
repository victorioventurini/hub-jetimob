-- Security Fixes Migration 2026-01-22
-- Fixes: 
-- 1. v_all_participants SECURITY DEFINER → SECURITY INVOKER
-- 2. Remove overly permissive profiles_select_ticket_participants_v1
-- 3. Clean up redundant partner_contacts policies  
-- 4. Remove "Partner companies are viewable by authenticated users" policy

-- ============================================================================
-- 1. FIX: v_all_participants → SECURITY INVOKER
-- ============================================================================

DROP VIEW IF EXISTS public.v_all_participants;

CREATE VIEW public.v_all_participants 
WITH (security_invoker = true) AS
SELECT 
  'internal'::text as user_type,
  p.id as participant_id,
  p.user_id as auth_user_id,
  p.display_name,
  p.work_email as email,
  p.photo_url,
  p.bu_id,
  NULL::uuid as company_id,
  NULL::text as company_name,
  t.name as team_name,
  jt.name as job_title,
  p.employment_status::text as status
FROM public.profiles p
LEFT JOIN public.teams t ON p.team_id = t.id
LEFT JOIN public.job_titles jt ON p.job_title_id = jt.id
WHERE p.deleted_at IS NULL 
  AND p.employment_status != 'terminated'

UNION ALL

SELECT 
  'external'::text as user_type,
  pc.id as participant_id,
  pc.user_id as auth_user_id,
  pc.name as display_name,
  pc.email,
  NULL::text as photo_url,
  pca.bu_id,
  pc.partner_company_id as company_id,
  pco.name as company_name,
  NULL::text as team_name,
  NULL::text as job_title,
  pc.status::text as status
FROM public.partner_contacts pc
JOIN public.partner_contact_bu_associations pca 
  ON pc.id = pca.partner_contact_id 
  AND pca.is_active = true 
  AND pca.deleted_at IS NULL
JOIN public.partner_companies pco 
  ON pc.partner_company_id = pco.id
WHERE pc.deleted_at IS NULL 
  AND pc.status = 'active';

COMMENT ON VIEW public.v_all_participants IS 'Unified view of internal (profiles) and external (partner_contacts) participants. Uses SECURITY INVOKER to respect RLS. Fixed 2026-01-22.';

-- ============================================================================
-- 2. FIX: Remove overly permissive profiles_select_ticket_participants_v1
-- This policy allows anyone who ever interacted with a ticket to see profile data
-- The existing profiles_select_bu_v2 properly restricts to BU members
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_ticket_participants_v1" ON public.profiles;

-- ============================================================================
-- 3. FIX: Clean up redundant/old partner_contacts policies
-- Keep only the V2 policies which properly use my_profile_id() and permission keys
-- ============================================================================

-- Remove old SELECT policy (uses current_bu_id() instead of proper BU scoping)
DROP POLICY IF EXISTS "Users can view partner contacts with BU association" ON public.partner_contacts;

-- Remove old UPDATE policy (redundant with partner_contacts_update_v2)
DROP POLICY IF EXISTS "Users can update partner contacts with BU association" ON public.partner_contacts;

-- Remove old INSERT policy (redundant with partner_contacts_insert_v2)
DROP POLICY IF EXISTS "Authenticated users can insert partner contacts" ON public.partner_contacts;

-- ============================================================================
-- 4. FIX: Remove overly permissive partner_companies policies
-- Keep only V2 and global policies which properly check BU membership/permissions
-- ============================================================================

-- Remove the most dangerous policy - allows ANY authenticated user to read
DROP POLICY IF EXISTS "Partner companies are viewable by authenticated users" ON public.partner_companies;

-- Remove old ALL policy (redundant with proper V2 policies)
DROP POLICY IF EXISTS "Partner companies can be managed by admins" ON public.partner_companies;

-- ============================================================================
-- 5. AUDIT: Log this security fix
-- ============================================================================

INSERT INTO public.audit_logs (
  action,
  entity_type,
  entity_id,
  old_values,
  new_values
) VALUES (
  'SECURITY_FIX',
  'rls_policies',
  NULL,
  jsonb_build_object(
    'removed_policies', ARRAY[
      'profiles_select_ticket_participants_v1',
      'Users can view partner contacts with BU association',
      'Users can update partner contacts with BU association', 
      'Authenticated users can insert partner contacts',
      'Partner companies are viewable by authenticated users',
      'Partner companies can be managed by admins'
    ],
    'fixed_views', ARRAY['v_all_participants']
  ),
  jsonb_build_object(
    'migration_date', '2026-01-22',
    'reason', 'Security scan findings - removed overly permissive policies',
    'kept_policies', ARRAY[
      'profiles_select_bu_v2',
      'profiles_select_own_v2',
      'partner_contacts_select_v2',
      'partner_contacts_insert_v2',
      'partner_contacts_update_v2',
      'partner_contacts_delete_v2',
      'partner_companies_global_select',
      'partner_companies_global_insert',
      'partner_companies_global_update',
      'partner_companies_global_delete'
    ]
  )
);