-- ============================================
-- WAVE 4: Identity Unification v2.2 - Funções SQL (Abordagem Incremental)
-- ============================================

-- NOTA: is_bu_member e is_bu_admin existentes não podem ser alterados
-- pois têm ~70 RLS policies dependentes. As novas funções profile-first
-- serão usadas em código novo.

-- 1. Novas funções profile-first (uso preferencial em código novo)
CREATE OR REPLACE FUNCTION is_profile_bu_member(p_profile_id UUID, p_bu_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bu_user_memberships 
    WHERE profile_id = p_profile_id 
      AND bu_id = p_bu_id 
      AND deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION is_profile_bu_admin(p_profile_id UUID, p_bu_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bu_user_memberships 
    WHERE profile_id = p_profile_id 
      AND bu_id = p_bu_id 
      AND role_in_bu IN ('admin', 'super_admin')
      AND deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION get_profile_bus(p_profile_id UUID)
RETURNS TABLE(bu_id UUID, bu_name TEXT, role_in_bu TEXT, is_default BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.bu_id, bu.name::TEXT, m.role_in_bu::TEXT, m.is_default
  FROM bu_user_memberships m
  JOIN bu_units bu ON m.bu_id = bu.id
  WHERE m.profile_id = p_profile_id
    AND m.deleted_at IS NULL
  ORDER BY m.is_default DESC, bu.name
$$;

-- 2. Função helper: my_profile_id (para RLS)
CREATE OR REPLACE FUNCTION my_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1
$$;

-- 3. Comentários
COMMENT ON FUNCTION is_profile_bu_member(UUID, UUID) IS 'Verifica se profile é membro de uma BU. Uso preferencial em código novo.';
COMMENT ON FUNCTION is_profile_bu_admin(UUID, UUID) IS 'Verifica se profile é admin de uma BU. Uso preferencial em código novo.';
COMMENT ON FUNCTION get_profile_bus(UUID) IS 'Retorna todas as BUs de um profile com role e default.';
COMMENT ON FUNCTION my_profile_id() IS 'Retorna o profile_id do usuário autenticado atual.';