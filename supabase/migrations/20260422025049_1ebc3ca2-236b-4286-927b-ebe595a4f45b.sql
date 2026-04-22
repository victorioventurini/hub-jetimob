-- W2: Otimização de RLS em profiles para eliminar reavaliação por linha de auth.uid().
-- Padrão: substituir `auth.uid()` por `(SELECT auth.uid())` em policies hot.
-- Referência: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Drop e recria SELECT (own) com subquery cache
DROP POLICY IF EXISTS profiles_select_own_v2 ON public.profiles;
CREATE POLICY profiles_select_own_v2
ON public.profiles
FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- Drop e recria UPDATE (own) com subquery cache
DROP POLICY IF EXISTS profiles_update_own_v2 ON public.profiles;
CREATE POLICY profiles_update_own_v2
ON public.profiles
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop e recria INSERT com subquery cache (mantém demais cláusulas)
DROP POLICY IF EXISTS profiles_insert_v2 ON public.profiles;
CREATE POLICY profiles_insert_v2
ON public.profiles
FOR INSERT
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR has_permission(my_profile_id(), bu_id, 'users.profile.create')
  OR has_permission(my_profile_id(), bu_id, 'users.profile.manage:bu')
);

-- Refresh estatísticas após mudança de policy
ANALYZE public.profiles;