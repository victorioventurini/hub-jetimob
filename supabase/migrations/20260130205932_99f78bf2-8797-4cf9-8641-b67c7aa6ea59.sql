-- Drop and recreate get_ticket_for_impersonation with correct return type
DROP FUNCTION IF EXISTS get_ticket_for_impersonation(uuid, uuid);

CREATE FUNCTION get_ticket_for_impersonation(
  p_ticket_id uuid,
  p_impersonated_profile_id uuid
)
RETURNS TABLE (
  id uuid,
  bu_id uuid,
  type text,
  title text,
  status text,
  expected_due_at timestamptz,
  visibility text,
  created_by_user_id uuid,
  owner_user_id uuid,
  assigned_contact_id uuid,
  external_company_id uuid,
  category_id uuid,
  subcategory_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  can_view boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_id uuid;
  v_impersonated_user_id uuid;
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only platform admins can use impersonation queries';
  END IF;
  
  v_bu_id := current_bu_id();
  
  SELECT profiles.user_id INTO v_impersonated_user_id
  FROM profiles
  WHERE profiles.id = p_impersonated_profile_id;
  
  IF v_impersonated_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PROFILE: Profile not found';
  END IF;
  
  IF NOT user_has_bu_access(v_impersonated_user_id, v_bu_id) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.bu_id,
    t.type::text,
    t.title,
    t.status::text,
    t.expected_due_at,
    t.visibility::text,
    t.created_by_user_id,
    t.owner_user_id,
    t.assigned_contact_id,
    t.external_company_id,
    t.category_id,
    t.subcategory_id,
    t.created_at,
    t.updated_at,
    CASE
      WHEN is_bu_admin(v_impersonated_user_id, t.bu_id) THEN true
      ELSE can_view_ticket(p_impersonated_profile_id, t.id)
    END as can_view
  FROM tickets t
  WHERE t.id = p_ticket_id 
    AND t.bu_id = v_bu_id
    AND t.deleted_at IS NULL;
END;
$$;