-- ============================================================
-- UNIFIED PARTICIPANT LAYER
-- ============================================================
-- Creates a unified view and RPC for handling internal users (profiles)
-- and external users (partner_contacts) transparently.
-- ============================================================

-- 1. Create unified view for reading participants
CREATE OR REPLACE VIEW public.v_all_participants AS
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

-- Add comment to view
COMMENT ON VIEW public.v_all_participants IS 
'Unified view combining internal profiles and external partner_contacts for transparent participant handling. Used by the Unified Participant Layer.';

-- 2. Create RPC to resolve participant identity by ID
CREATE OR REPLACE FUNCTION public.resolve_participant_identity(
  p_participant_id uuid,
  p_bu_id uuid DEFAULT NULL
) RETURNS TABLE (
  user_type text,
  participant_id uuid,
  auth_user_id uuid,
  display_name text,
  email text,
  photo_url text,
  company_id uuid,
  company_name text,
  team_name text,
  job_title text
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try profiles first (internal users)
  RETURN QUERY
  SELECT 
    'internal'::text,
    p.id,
    p.user_id,
    p.display_name,
    p.work_email,
    p.photo_url,
    NULL::uuid,
    NULL::text,
    t.name,
    jt.name
  FROM public.profiles p
  LEFT JOIN public.teams t ON p.team_id = t.id
  LEFT JOIN public.job_titles jt ON p.job_title_id = jt.id
  WHERE p.id = p_participant_id
    AND p.deleted_at IS NULL
    AND (p_bu_id IS NULL OR p.bu_id = p_bu_id);
    
  IF FOUND THEN RETURN; END IF;
  
  -- Try partner_contacts (external users)
  RETURN QUERY
  SELECT 
    'external'::text,
    pc.id,
    pc.user_id,
    pc.name,
    pc.email,
    NULL::text,
    pc.partner_company_id,
    pco.name,
    NULL::text,
    NULL::text
  FROM public.partner_contacts pc
  JOIN public.partner_companies pco ON pc.partner_company_id = pco.id
  LEFT JOIN public.partner_contact_bu_associations pca 
    ON pc.id = pca.partner_contact_id AND pca.is_active = true
  WHERE pc.id = p_participant_id
    AND pc.deleted_at IS NULL
    AND (p_bu_id IS NULL OR pca.bu_id = p_bu_id);
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION public.resolve_participant_identity IS 
'Resolves a participant ID to unified identity data. Checks profiles first, then partner_contacts. Part of the Unified Participant Layer.';

-- 3. Create index for performance on the view's source tables
DO $$
BEGIN
  -- Index for profiles lookup
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_participant_lookup') THEN
    CREATE INDEX idx_profiles_participant_lookup ON public.profiles (id, bu_id) 
    WHERE deleted_at IS NULL AND employment_status != 'terminated';
  END IF;
  
  -- Index for partner_contacts lookup  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_partner_contacts_participant_lookup') THEN
    CREATE INDEX idx_partner_contacts_participant_lookup ON public.partner_contacts (id, partner_company_id)
    WHERE deleted_at IS NULL AND status = 'active';
  END IF;
END $$;