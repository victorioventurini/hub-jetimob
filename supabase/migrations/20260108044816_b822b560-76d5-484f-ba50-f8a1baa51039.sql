-- Corrigir função is_team_leader para trabalhar com convenção de identidade
-- teams.leader_user_id armazena profiles.id, mas recebemos auth.users.id

CREATE OR REPLACE FUNCTION public.is_team_leader(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.profiles p ON p.id = t.leader_user_id
    WHERE t.id = p_team_id
      AND p.user_id = p_user_id  -- Compara auth.users.id com profiles.user_id
      AND t.deleted_at IS NULL
  )
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.is_team_leader(uuid, uuid) IS 
  'Verifica se um usuário é líder de um time. 
   p_user_id: auth.users.id (auth.uid())
   p_team_id: teams.id
   Internamente converte para profile_id pois teams.leader_user_id armazena profiles.id';

-- Criar função auxiliar para verificar liderança por profile_id (para uso interno)
CREATE OR REPLACE FUNCTION public.is_team_leader_by_profile(p_profile_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.leader_user_id = p_profile_id
      AND t.deleted_at IS NULL
  )
$$;

COMMENT ON FUNCTION public.is_team_leader_by_profile(uuid, uuid) IS 
  'Verifica se um profile é líder de um time.
   p_profile_id: profiles.id
   p_team_id: teams.id
   Uso: quando já temos o profile_id disponível';