-- ============================================
-- SECURITY FIX: External Companies Document Protection
-- ============================================
-- Issue: external_companies.document (CPF/CNPJ) visible to all BU members
-- Fix: Create a SECURITY DEFINER function to apply field-level privacy
-- ============================================

-- 1. Create secure function to get partner company with privacy controls
CREATE OR REPLACE FUNCTION public.get_partner_company_with_privacy(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  bu_id uuid,
  name text,
  legal_name text,
  -- Document only visible to users with partner management permission
  document text,
  document_type text,
  person_type text,
  allowed_domains text[],
  status text,
  notes text,
  created_at timestamptz,
  created_by uuid,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_profile_id uuid;
  v_company_bu_id uuid;
  v_can_manage boolean;
BEGIN
  -- Get the calling user's profile ID
  v_my_profile_id := my_profile_id();
  
  -- Get company's BU via association
  SELECT pba.bu_id INTO v_company_bu_id
  FROM external_company_bu_associations pba
  WHERE pba.external_company_id = p_company_id
    AND pba.deleted_at IS NULL
    AND is_profile_bu_member(v_my_profile_id, pba.bu_id)
  LIMIT 1;
  
  -- If no BU found, user can't access
  IF v_company_bu_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user has partner management permission
  v_can_manage := has_permission(v_my_profile_id, v_company_bu_id, 'partners.company.manage:bu');
  
  RETURN QUERY
  SELECT 
    ec.id,
    ec.bu_id,
    ec.name,
    ec.legal_name,
    -- Sensitive document fields: only visible with management permission
    CASE WHEN v_can_manage THEN ec.document ELSE NULL END,
    CASE WHEN v_can_manage THEN ec.document_type ELSE NULL END,
    ec.person_type,
    ec.allowed_domains,
    ec.status::text,
    ec.notes,
    ec.created_at,
    ec.created_by,
    ec.updated_at
  FROM external_companies ec
  WHERE ec.id = p_company_id
    AND ec.deleted_at IS NULL;
END;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_partner_company_with_privacy(uuid) TO authenticated;

-- 3. Add comment for documentation
COMMENT ON FUNCTION public.get_partner_company_with_privacy(uuid) IS 
'Returns partner company data with field-level privacy controls.
Sensitive fields (document, document_type) are only visible to users with partners.company.manage:bu permission.
This protects CPF/CNPJ/tax IDs from being exposed to general BU members.';

-- 4. Create a list function for partner companies with privacy
CREATE OR REPLACE FUNCTION public.list_partner_companies_with_privacy(p_bu_id uuid)
RETURNS TABLE (
  id uuid,
  bu_id uuid,
  name text,
  legal_name text,
  document text,
  document_type text,
  person_type text,
  allowed_domains text[],
  status text,
  notes text,
  created_at timestamptz,
  created_by uuid,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_profile_id uuid;
  v_can_manage boolean;
BEGIN
  -- Get the calling user's profile ID
  v_my_profile_id := my_profile_id();
  
  -- Verify BU membership
  IF NOT is_profile_bu_member(v_my_profile_id, p_bu_id) THEN
    RETURN;
  END IF;
  
  -- Check if user has partner management permission
  v_can_manage := has_permission(v_my_profile_id, p_bu_id, 'partners.company.manage:bu');
  
  RETURN QUERY
  SELECT 
    ec.id,
    ec.bu_id,
    ec.name,
    ec.legal_name,
    -- Sensitive document fields: only visible with management permission
    CASE WHEN v_can_manage THEN ec.document ELSE NULL END,
    CASE WHEN v_can_manage THEN ec.document_type ELSE NULL END,
    ec.person_type,
    ec.allowed_domains,
    ec.status::text,
    ec.notes,
    ec.created_at,
    ec.created_by,
    ec.updated_at
  FROM external_companies ec
  JOIN external_company_bu_associations pba ON pba.external_company_id = ec.id
  WHERE pba.bu_id = p_bu_id
    AND pba.deleted_at IS NULL
    AND ec.deleted_at IS NULL
  ORDER BY ec.name;
END;
$$;

-- 5. Grant execute permission
GRANT EXECUTE ON FUNCTION public.list_partner_companies_with_privacy(uuid) TO authenticated;

-- 6. Add comment
COMMENT ON FUNCTION public.list_partner_companies_with_privacy(uuid) IS 
'Returns list of partner companies for a BU with field-level privacy controls.
Sensitive fields (document, document_type) are only visible to users with partners.company.manage:bu permission.';