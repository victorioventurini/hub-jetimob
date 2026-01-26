-- ============================================================
-- Migration: Fix okr_initiatives RLS policies
-- 
-- PROBLEMA: As políticas atuais verificam apenas permission key
-- sem validar ownership ou liderança, permitindo que qualquer
-- usuário com a permissão edite todas as iniciativas da BU.
--
-- CORREÇÃO: Adicionar validação de ownership, contributors e
-- liderança do time do KR vinculado.
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS okr_initiatives_update_v2 ON okr_initiatives;
DROP POLICY IF EXISTS okr_initiatives_delete_v2 ON okr_initiatives;

-- UPDATE: Requires permission + (owner OR contributor OR team leader of linked KR)
CREATE POLICY okr_initiatives_update_v2 ON okr_initiatives
FOR UPDATE USING (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.update:self_or_owner')
  AND (
    -- É owner da iniciativa
    owner_user_id = my_profile_id()
    -- OU é contributor da iniciativa
    OR my_profile_id() = ANY(contributors)
    -- OU é líder do time do KR vinculado (inclui sub-times)
    OR can_manage_team_okr_by_profile(
      my_profile_id(), 
      (SELECT team_id FROM okr_team_key_results WHERE id = kr_id)
    )
  )
);

-- DELETE: Requires permission + (owner OR team leader of linked KR)
-- Nota: Contributors não podem deletar, apenas owner ou líder
CREATE POLICY okr_initiatives_delete_v2 ON okr_initiatives
FOR DELETE USING (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.delete:self_or_owner')
  AND (
    -- É owner da iniciativa
    owner_user_id = my_profile_id()
    -- OU é líder do time do KR vinculado
    OR can_manage_team_okr_by_profile(
      my_profile_id(), 
      (SELECT team_id FROM okr_team_key_results WHERE id = kr_id)
    )
  )
);