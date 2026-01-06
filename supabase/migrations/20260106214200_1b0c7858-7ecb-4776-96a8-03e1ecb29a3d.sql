-- =============================================
-- AUDITORIA DE PERMISSÕES - POLÍTICAS RLS DE OKRs
-- =============================================

-- Para team_objectives - corrigir erro de sintaxe
DROP POLICY IF EXISTS "Super admin can delete team objectives" ON okr_team_objectives;
DROP POLICY IF EXISTS "BU admin can delete team objectives" ON okr_team_objectives;
DROP POLICY IF EXISTS "Team leader can delete team objectives" ON okr_team_objectives;

DROP POLICY IF EXISTS "Users can cancel team objectives" ON okr_team_objectives;
CREATE POLICY "Users can cancel team objectives"
  ON okr_team_objectives
  FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR is_bu_admin(auth.uid(), bu_id)
    OR (owner_user_id = auth.uid() AND user_can_manage_team(auth.uid(), team_id))
  );

-- Para org_key_results
DROP POLICY IF EXISTS "Super admin can delete org key results" ON okr_org_key_results;
DROP POLICY IF EXISTS "BU admin can delete org key results" ON okr_org_key_results;

DROP POLICY IF EXISTS "Users can cancel org key results" ON okr_org_key_results;
CREATE POLICY "Users can cancel org key results"
  ON okr_org_key_results
  FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM okr_org_objectives o 
      WHERE o.id = okr_org_key_results.org_objective_id 
      AND is_bu_admin(auth.uid(), o.bu_id)
    )
    OR owner_user_id = auth.uid()
  );

-- Para team_key_results
DROP POLICY IF EXISTS "Super admin can delete team key results" ON okr_team_key_results;
DROP POLICY IF EXISTS "BU admin can delete team key results" ON okr_team_key_results;
DROP POLICY IF EXISTS "Team leader can delete team key results" ON okr_team_key_results;

DROP POLICY IF EXISTS "Users can cancel team key results" ON okr_team_key_results;
CREATE POLICY "Users can cancel team key results"
  ON okr_team_key_results
  FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR is_bu_admin(auth.uid(), bu_id)
    OR (owner_user_id = auth.uid() AND user_can_manage_team(auth.uid(), team_id))
  );

-- 5. REMOVER POLÍTICAS DE DELETE FÍSICO (segurança)
-- Apenas super_admin pode fazer DELETE físico (para limpeza de dados de teste)

DROP POLICY IF EXISTS "Only super admin can hard delete org objectives" ON okr_org_objectives;
CREATE POLICY "Only super admin can hard delete org objectives"
  ON okr_org_objectives
  FOR DELETE
  USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Only super admin can hard delete team objectives" ON okr_team_objectives;
CREATE POLICY "Only super admin can hard delete team objectives"
  ON okr_team_objectives
  FOR DELETE
  USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Only super admin can hard delete org key results" ON okr_org_key_results;
CREATE POLICY "Only super admin can hard delete org key results"
  ON okr_org_key_results
  FOR DELETE
  USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Only super admin can hard delete team key results" ON okr_team_key_results;
CREATE POLICY "Only super admin can hard delete team key results"
  ON okr_team_key_results
  FOR DELETE
  USING (is_super_admin(auth.uid()));