-- ============================================================
-- IDENTITY CONVENTION FIX - Funções Canônicas e RLS
-- ============================================================

-- 1. Criar alias my_profile_id() que é mais intuitivo
CREATE OR REPLACE FUNCTION public.my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1
$$;

COMMENT ON FUNCTION public.my_profile_id() IS 
  'Retorna o profiles.id do usuário autenticado (auth.uid()).
   Uso: para comparar com colunas de domínio que armazenam profiles.id.
   Exemplo: WHERE owner_user_id = my_profile_id()';

-- 2. Criar alias profile_id_from_user_id (mais descritivo que get_profile_id)
CREATE OR REPLACE FUNCTION public.profile_id_from_user_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM profiles WHERE user_id = p_user_id LIMIT 1
$$;

COMMENT ON FUNCTION public.profile_id_from_user_id(uuid) IS 
  'Converte auth.users.id para profiles.id.
   Uso: quando você tem um user_id e precisa do profile_id.';

-- 3. Criar alias user_id_from_profile_id (mais descritivo que get_auth_user_id)
CREATE OR REPLACE FUNCTION public.user_id_from_profile_id(p_profile_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id FROM profiles WHERE id = p_profile_id LIMIT 1
$$;

COMMENT ON FUNCTION public.user_id_from_profile_id(uuid) IS 
  'Converte profiles.id para auth.users.id.
   Uso: quando você tem um profile_id e precisa do auth user_id.';

-- 4. CORRIGIR RLS POLICY em bu_user_permission_groups
-- A coluna user_id armazena profiles.id, não auth.users.id
DROP POLICY IF EXISTS "Users can view their own groups" ON public.bu_user_permission_groups;

CREATE POLICY "Users can view their own groups" 
ON public.bu_user_permission_groups 
FOR SELECT
TO authenticated
USING (user_id = my_profile_id());

-- 5. Adicionar comentários às colunas para documentar convenção
COMMENT ON COLUMN public.bu_user_permission_groups.user_id IS 
  'ATENÇÃO: Armazena profiles.id (não auth.users.id). Ver docs/IDENTITY_CONVENTION.md';

COMMENT ON COLUMN public.teams.leader_user_id IS 
  'ATENÇÃO: Armazena profiles.id (não auth.users.id). Ver docs/IDENTITY_CONVENTION.md';

COMMENT ON COLUMN public.asset_inventory.current_user_id IS 
  'ATENÇÃO: Armazena profiles.id (não auth.users.id). Ver docs/IDENTITY_CONVENTION.md';

COMMENT ON COLUMN public.tickets.owner_user_id IS 
  'ATENÇÃO: Armazena profiles.id (não auth.users.id). Ver docs/IDENTITY_CONVENTION.md';

COMMENT ON COLUMN public.tickets.created_by_user_id IS 
  'ATENÇÃO: Armazena profiles.id (não auth.users.id). Ver docs/IDENTITY_CONVENTION.md';

COMMENT ON COLUMN public.okr_org_objectives.owner_user_id IS 
  'ATENÇÃO: Armazena profiles.id (não auth.users.id). Ver docs/IDENTITY_CONVENTION.md';

COMMENT ON COLUMN public.okr_team_objectives.owner_user_id IS 
  'ATENÇÃO: Armazena profiles.id (não auth.users.id). Ver docs/IDENTITY_CONVENTION.md';

COMMENT ON COLUMN public.okr_team_key_results.owner_user_id IS 
  'ATENÇÃO: Armazena profiles.id (não auth.users.id). Ver docs/IDENTITY_CONVENTION.md';

COMMENT ON COLUMN public.okr_org_key_results.owner_user_id IS 
  'ATENÇÃO: Armazena profiles.id (não auth.users.id). Ver docs/IDENTITY_CONVENTION.md';