
-- Criar função RPC que permite admins verificarem visibilidade de tickets 
-- simulando o contexto de outro usuário (para impersonação)

CREATE OR REPLACE FUNCTION public.get_ticket_for_impersonation(
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
  partner_company_id uuid,
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
  -- Apenas platform admins podem usar esta função
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only platform admins can use impersonation queries';
  END IF;
  
  v_bu_id := current_bu_id();
  
  -- Obter o auth user_id do profile impersonado
  SELECT user_id INTO v_impersonated_user_id
  FROM profiles
  WHERE profiles.id = p_impersonated_profile_id;
  
  IF v_impersonated_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PROFILE: Profile not found';
  END IF;
  
  -- Verificar se o usuário impersonado tem acesso à BU
  IF NOT user_has_bu_access(v_impersonated_user_id, v_bu_id) THEN
    -- Retornar vazio se usuário não tem acesso à BU
    RETURN;
  END IF;
  
  -- Retornar ticket com flag de visibilidade baseada no usuário impersonado
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
    t.partner_company_id,
    t.category_id,
    t.subcategory_id,
    t.created_at,
    t.updated_at,
    -- Verificar visibilidade como se fosse o usuário impersonado
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

-- Comentário documentando a função
COMMENT ON FUNCTION public.get_ticket_for_impersonation IS 
  'Permite que platform admins consultem um ticket simulando a visibilidade de outro usuário. Usado para feature de impersonation.';
