-- Adicionar policy para usuário ler seu próprio perfil
-- Isso é necessário pois a policy atual só permite leitura se o bu_id do profile
-- estiver nos bu_user_memberships, mas o usuário pode ter um profile em uma BU diferente

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());