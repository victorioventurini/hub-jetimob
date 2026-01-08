
-- =====================================================
-- CORREÇÃO DE RLS: auth.uid() vs profiles.id
-- =====================================================
-- Problema: policies comparavam auth.uid() com colunas que armazenam profiles.id
-- Solução: usar my_profile_id() para converter auth.uid() → profiles.id
-- =====================================================

-- 1) okr_checkins: Corrigir policy de INSERT
DROP POLICY IF EXISTS "KR owners can create checkins" ON public.okr_checkins;
CREATE POLICY "KR owners can create checkins" ON public.okr_checkins
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM okr_team_key_results kr
    WHERE kr.id = okr_checkins.kr_id
      AND (
        kr.owner_user_id = my_profile_id()
        OR my_profile_id() = ANY(kr.co_responsibles)
      )
  )
);

-- 2) okr_dependencies: Corrigir policy de ALL
DROP POLICY IF EXISTS "KR owners can manage dependencies" ON public.okr_dependencies;
CREATE POLICY "KR owners can manage dependencies" ON public.okr_dependencies
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM okr_team_key_results kr
    WHERE kr.id = okr_dependencies.kr_id
      AND (
        kr.owner_user_id = my_profile_id()
        OR my_profile_id() = ANY(kr.co_responsibles)
      )
  )
);

-- 3) okr_initiatives: Corrigir policies de UPDATE e DELETE
DROP POLICY IF EXISTS "Users can update their own initiatives or as team leader" ON public.okr_initiatives;
CREATE POLICY "Users can update their own initiatives or as team leader" ON public.okr_initiatives
FOR UPDATE TO public
USING (
  deleted_at IS NULL
  AND (
    owner_user_id = my_profile_id()
    OR EXISTS (
      SELECT 1 FROM okr_team_key_results kr
      JOIN teams t ON kr.team_id = t.id
      WHERE kr.id = okr_initiatives.kr_id
        AND t.leader_user_id = my_profile_id()
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their own initiatives or as team leader" ON public.okr_initiatives;
CREATE POLICY "Users can delete their own initiatives or as team leader" ON public.okr_initiatives
FOR DELETE TO public
USING (
  owner_user_id = my_profile_id()
  OR EXISTS (
    SELECT 1 FROM okr_team_key_results kr
    JOIN teams t ON kr.team_id = t.id
    WHERE kr.id = okr_initiatives.kr_id
      AND t.leader_user_id = my_profile_id()
  )
);

-- 4) okr_org_key_results: Corrigir policy de UPDATE/cancel
DROP POLICY IF EXISTS "Users can cancel org key results" ON public.okr_org_key_results;
CREATE POLICY "Users can cancel org key results" ON public.okr_org_key_results
FOR UPDATE TO public
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM okr_org_objectives o
    WHERE o.id = okr_org_key_results.org_objective_id
      AND is_bu_admin(auth.uid(), o.bu_id)
  )
  OR owner_user_id = my_profile_id()
);

-- 5) okr_team_key_results: Corrigir policies
DROP POLICY IF EXISTS "KR owners can update their KRs" ON public.okr_team_key_results;
CREATE POLICY "KR owners can update their KRs" ON public.okr_team_key_results
FOR UPDATE TO public
USING (
  owner_user_id = my_profile_id()
  OR my_profile_id() = ANY(co_responsibles)
);

DROP POLICY IF EXISTS "Team leaders can manage their team KRs" ON public.okr_team_key_results;
CREATE POLICY "Team leaders can manage their team KRs" ON public.okr_team_key_results
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = okr_team_key_results.team_id
      AND t.leader_user_id = my_profile_id()
  )
);

DROP POLICY IF EXISTS "Users can cancel team key results" ON public.okr_team_key_results;
CREATE POLICY "Users can cancel team key results" ON public.okr_team_key_results
FOR UPDATE TO public
USING (
  is_super_admin(auth.uid())
  OR is_bu_admin(auth.uid(), bu_id)
  OR (
    owner_user_id = my_profile_id()
    AND user_can_manage_team(auth.uid(), team_id)
  )
);

-- 6) okr_team_objectives: Corrigir policies
DROP POLICY IF EXISTS "Team leaders can manage their team objectives" ON public.okr_team_objectives;
CREATE POLICY "Team leaders can manage their team objectives" ON public.okr_team_objectives
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = okr_team_objectives.team_id
      AND t.leader_user_id = my_profile_id()
  )
);

DROP POLICY IF EXISTS "Users can cancel team objectives" ON public.okr_team_objectives;
CREATE POLICY "Users can cancel team objectives" ON public.okr_team_objectives
FOR UPDATE TO public
USING (
  is_super_admin(auth.uid())
  OR is_bu_admin(auth.uid(), bu_id)
  OR (
    owner_user_id = my_profile_id()
    AND user_can_manage_team(auth.uid(), team_id)
  )
);

-- 7) okr_coaching_events: Corrigir policies
-- Primeiro verificar se a coluna user_id é profiles.id ou auth.users.id
-- Nota: Esta tabela parece usar auth.users.id baseado no padrão de auditoria
-- Vou verificar e ajustar se necessário

-- Adicionar comentários de documentação nas colunas corrigidas
COMMENT ON POLICY "KR owners can create checkins" ON public.okr_checkins IS 
  'Usa my_profile_id() para comparar com owner_user_id (profiles.id)';

COMMENT ON POLICY "KR owners can manage dependencies" ON public.okr_dependencies IS 
  'Usa my_profile_id() para comparar com owner_user_id (profiles.id)';

COMMENT ON POLICY "Users can update their own initiatives or as team leader" ON public.okr_initiatives IS 
  'Usa my_profile_id() para comparar com owner_user_id e leader_user_id (profiles.id)';

COMMENT ON POLICY "Team leaders can manage their team KRs" ON public.okr_team_key_results IS 
  'Usa my_profile_id() para comparar com leader_user_id (profiles.id)';

COMMENT ON POLICY "Team leaders can manage their team objectives" ON public.okr_team_objectives IS 
  'Usa my_profile_id() para comparar com leader_user_id (profiles.id)';
