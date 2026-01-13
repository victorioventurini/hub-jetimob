-- Corrigir função can_view_ticket para usar owner_user_id ao invés de assigned_to_user_id
CREATE OR REPLACE FUNCTION public.can_view_ticket(p_profile_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_bu_id uuid;
  v_user_id uuid;
BEGIN
  v_bu_id := current_bu_id();
  
  -- Convert profile_id to auth user_id for team/squad checks
  v_user_id := user_id_from_profile_id(p_profile_id);
  
  SELECT 
    t.id,
    t.created_by_user_id,
    t.owner_user_id,
    t.visibility,
    t.visibility_team_ids,
    t.visibility_squad_ids,
    t.visibility_user_ids
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = p_ticket_id AND t.bu_id = v_bu_id AND t.deleted_at IS NULL;
  
  IF v_ticket IS NULL THEN
    RETURN false;
  END IF;
  
  -- Creator or owner always can view (these store profiles.id)
  IF v_ticket.created_by_user_id = p_profile_id OR v_ticket.owner_user_id = p_profile_id THEN
    RETURN true;
  END IF;
  
  -- Participants (watchers, assignees, requesters) can always view
  -- ticket_participants.user_id stores profiles.id per domain convention
  IF EXISTS (
    SELECT 1 FROM public.ticket_participants tp
    WHERE tp.ticket_id = p_ticket_id
      AND tp.user_id = p_profile_id
      AND tp.is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Check visibility rules
  CASE v_ticket.visibility
    WHEN 'public' THEN
      RETURN true;
    
    WHEN 'team' THEN
      -- Team/squad memberships use auth.users.id
      IF v_ticket.visibility_team_ids IS NOT NULL 
         AND array_length(v_ticket.visibility_team_ids, 1) IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.user_team_memberships utm
          WHERE utm.user_id = v_user_id
            AND utm.team_id = ANY(v_ticket.visibility_team_ids)
        ) THEN
          RETURN true;
        END IF;
      END IF;
      
      IF v_ticket.visibility_squad_ids IS NOT NULL 
         AND array_length(v_ticket.visibility_squad_ids, 1) IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.squad_memberships sm
          WHERE sm.user_id = v_user_id
            AND sm.squad_id = ANY(v_ticket.visibility_squad_ids)
            AND sm.deleted_at IS NULL
        ) THEN
          RETURN true;
        END IF;
      END IF;
      
      -- visibility_user_ids stores profiles.id per domain convention
      IF v_ticket.visibility_user_ids IS NOT NULL 
         AND p_profile_id = ANY(v_ticket.visibility_user_ids) THEN
        RETURN true;
      END IF;
      
      RETURN false;
    
    WHEN 'private' THEN
      RETURN (v_ticket.visibility_user_ids IS NOT NULL 
              AND p_profile_id = ANY(v_ticket.visibility_user_ids));
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Corrigir função get_ticket_for_impersonation para usar owner_user_id
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
  SELECT profiles.user_id INTO v_impersonated_user_id
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