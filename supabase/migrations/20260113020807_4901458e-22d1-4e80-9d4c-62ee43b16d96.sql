
-- Criar função RPC que lista tickets visíveis para o usuário impersonado
-- Usada para simular a experiência do usuário durante impersonação

CREATE OR REPLACE FUNCTION public.get_visible_ticket_ids_for_impersonation(
  p_impersonated_profile_id uuid
)
RETURNS TABLE (ticket_id uuid)
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
    RETURN; -- Retornar vazio
  END IF;
  
  -- Retornar IDs de tickets que o usuário impersonado pode ver
  RETURN QUERY
  SELECT t.id
  FROM tickets t
  WHERE t.bu_id = v_bu_id
    AND t.deleted_at IS NULL
    AND (
      -- Admins da BU podem ver todos
      is_bu_admin(v_impersonated_user_id, t.bu_id)
      -- Demais usuários passam pela função de visibilidade
      OR can_view_ticket(p_impersonated_profile_id, t.id)
    );
END;
$$;

COMMENT ON FUNCTION public.get_visible_ticket_ids_for_impersonation IS 
  'Retorna IDs de tickets visíveis para um usuário impersonado. Usado para filtrar listas durante impersonation.';
