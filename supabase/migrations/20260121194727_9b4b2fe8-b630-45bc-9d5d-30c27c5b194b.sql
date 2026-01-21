-- Fix: get_user_partner_contact_id deve considerar a BU atual para retornar o contactId correto
-- Isso garante que usuários externos com múltiplas associações usem o contactId da BU correta

CREATE OR REPLACE FUNCTION public.get_user_partner_contact_id(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_current_bu_id uuid;
BEGIN
  -- Obtém a BU atual do contexto (header x-current-bu-id)
  v_current_bu_id := current_bu_id();
  
  -- Se temos uma BU atual, buscar o contactId que tem associação ativa nessa BU
  IF v_current_bu_id IS NOT NULL THEN
    SELECT pc.id INTO v_contact_id
    FROM public.partner_contacts pc
    JOIN public.partner_contact_bu_associations pcba 
      ON pcba.partner_contact_id = pc.id 
      AND pcba.bu_id = v_current_bu_id
      AND pcba.is_active = true
      AND pcba.deleted_at IS NULL
    WHERE pc.user_id = p_user_id
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL
    LIMIT 1;
    
    IF v_contact_id IS NOT NULL THEN
      RETURN v_contact_id;
    END IF;
  END IF;
  
  -- Fallback: retorna qualquer contactId ativo (comportamento anterior)
  SELECT pc.id INTO v_contact_id
  FROM public.partner_contacts pc
  WHERE pc.user_id = p_user_id
    AND pc.status = 'active'
    AND pc.deleted_at IS NULL
  LIMIT 1;
  
  RETURN v_contact_id;
END;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.get_user_partner_contact_id(uuid) IS 
'Retorna o partner_contact_id para um auth.users.id. Prioriza o contactId com associação ativa na BU atual (via current_bu_id()). Fallback para qualquer contactId ativo se não houver BU no contexto.';