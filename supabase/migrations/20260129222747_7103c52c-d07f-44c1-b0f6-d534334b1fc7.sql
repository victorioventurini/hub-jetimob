
-- MIGRATION: Rename partner_company_id → external_company_id in partner_contact_capabilities
-- Step 1: Drop the view first (it references the column we're renaming)
DROP VIEW IF EXISTS public.v_partner_services_by_bu;

-- Step 2: Rename column in partner_contact_capabilities
ALTER TABLE public.partner_contact_capabilities 
RENAME COLUMN partner_company_id TO external_company_id;

-- Step 3: Recreate view with new column name
CREATE VIEW public.v_partner_services_by_bu AS
SELECT 
  psm.id,
  pba.bu_id,
  psm.external_company_id,
  pc.name AS company_name,
  pc.person_type,
  pc.document,
  pc.document_type,
  psm.category_id,
  tc.name AS category_name,
  psm.subcategory_id,
  ts.name AS subcategory_name,
  psm.status
FROM partner_service_mappings psm
JOIN external_companies pc ON pc.id = psm.external_company_id AND pc.deleted_at IS NULL
JOIN external_company_bu_associations pba ON pba.external_company_id = pc.id AND pba.is_active = true AND pba.deleted_at IS NULL
JOIN ticket_categories tc ON tc.id = psm.category_id AND tc.deleted_at IS NULL
LEFT JOIN ticket_subcategories ts ON ts.id = psm.subcategory_id AND ts.deleted_at IS NULL
WHERE psm.deleted_at IS NULL;

-- Step 4: Drop and recreate resolve_ticket_assignee function with new param name
DROP FUNCTION IF EXISTS public.resolve_ticket_assignee(uuid, uuid, uuid, uuid);

CREATE FUNCTION public.resolve_ticket_assignee(
  p_bu_id uuid, 
  p_external_company_id uuid,
  p_category_id uuid, 
  p_subcategory_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_id uuid;
BEGIN
  -- Priority 1: Contact with specific subcategory match
  IF p_subcategory_id IS NOT NULL THEN
    SELECT contact_id INTO v_contact_id
    FROM public.partner_contact_capabilities
    WHERE bu_id = p_bu_id
      AND external_company_id = p_external_company_id
      AND category_id = p_category_id
      AND subcategory_id = p_subcategory_id
      AND is_active = true
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_contact_id IS NOT NULL THEN
      RETURN v_contact_id;
    END IF;
  END IF;

  -- Priority 2: Contact that handles entire category
  SELECT contact_id INTO v_contact_id
  FROM public.partner_contact_capabilities
  WHERE bu_id = p_bu_id
    AND external_company_id = p_external_company_id
    AND category_id = p_category_id
    AND subcategory_id IS NULL
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1;

  RETURN v_contact_id;
END;
$function$;

COMMENT ON FUNCTION public.resolve_ticket_assignee IS 'Resolves ticket assignee based on contact capabilities. Uses external_company_id (unified model v2.73+).';
