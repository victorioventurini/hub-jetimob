
-- Dropar função existente e recriar com nome correto do parâmetro
DROP FUNCTION IF EXISTS public.get_profile_id(uuid);

-- Helper functions para conversão de IDs (user_id ↔ profile_id)
-- Converte auth.users.id para profiles.id
CREATE FUNCTION public.get_profile_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM profiles WHERE user_id = p_user_id LIMIT 1
$$;

COMMENT ON FUNCTION public.get_profile_id(uuid) IS 
  'Converte auth.users.id (user_id) para profiles.id (profile_id)';

-- Converte profiles.id para auth.users.id
CREATE OR REPLACE FUNCTION public.get_auth_user_id(p_profile_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id FROM profiles WHERE id = p_profile_id LIMIT 1
$$;

COMMENT ON FUNCTION public.get_auth_user_id(uuid) IS 
  'Converte profiles.id (profile_id) para auth.users.id (user_id)';

-- Função que retorna o profile_id do usuário atual (auth.uid())
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1
$$;

COMMENT ON FUNCTION public.current_profile_id() IS 
  'Retorna o profiles.id do usuário atualmente autenticado';
