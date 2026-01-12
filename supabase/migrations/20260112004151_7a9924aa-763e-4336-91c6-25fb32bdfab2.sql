-- =====================================================
-- Wave 2E: Performance - Columns + Triggers (No Init)
-- =====================================================

-- 1. Adicionar colunas de contagem
ALTER TABLE okr_team_objectives 
  ADD COLUMN IF NOT EXISTS kr_count int DEFAULT 0;

ALTER TABLE okr_team_objectives 
  ADD COLUMN IF NOT EXISTS avg_progress numeric(5,2) DEFAULT 0;

ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS member_count int DEFAULT 0;

-- 2. Criar função para atualizar kr_count (bypass trigger via session var)
CREATE OR REPLACE FUNCTION update_objective_kr_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Set session variable to bypass BU scope check
  PERFORM set_config('app.bypass_bu_scope', 'true', true);
  
  IF TG_OP = 'INSERT' THEN
    UPDATE okr_team_objectives 
    SET kr_count = COALESCE(kr_count, 0) + 1 
    WHERE id = NEW.team_objective_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE okr_team_objectives 
    SET kr_count = GREATEST(COALESCE(kr_count, 0) - 1, 0) 
    WHERE id = OLD.team_objective_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Criar trigger para kr_count
DROP TRIGGER IF EXISTS trg_update_objective_kr_count ON okr_team_key_results;
CREATE TRIGGER trg_update_objective_kr_count
AFTER INSERT OR DELETE ON okr_team_key_results
FOR EACH ROW EXECUTE FUNCTION update_objective_kr_count();

-- 4. Criar função para atualizar member_count
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('app.bypass_bu_scope', 'true', true);
  
  IF TG_OP = 'INSERT' THEN
    UPDATE teams 
    SET member_count = COALESCE(member_count, 0) + 1 
    WHERE id = NEW.team_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teams 
    SET member_count = GREATEST(COALESCE(member_count, 0) - 1, 0) 
    WHERE id = OLD.team_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Criar trigger para member_count
DROP TRIGGER IF EXISTS trg_update_team_member_count ON user_team_memberships;
CREATE TRIGGER trg_update_team_member_count
AFTER INSERT OR DELETE ON user_team_memberships
FOR EACH ROW EXECUTE FUNCTION update_team_member_count();

-- 6. Criar função de inicialização (para execução manual via Dashboard)
CREATE OR REPLACE FUNCTION initialize_counting_columns()
RETURNS TABLE(objectives_updated int, teams_updated int) AS $$
DECLARE
  obj_count int := 0;
  team_count int := 0;
BEGIN
  -- Nota: Esta função deve ser executada via Dashboard SQL Editor
  -- onde não há restrição de BU context
  
  UPDATE okr_team_objectives o
  SET kr_count = (
    SELECT COUNT(*) 
    FROM okr_team_key_results kr 
    WHERE kr.team_objective_id = o.id AND kr.cancelled_at IS NULL
  )
  WHERE kr_count IS DISTINCT FROM (
    SELECT COUNT(*) 
    FROM okr_team_key_results kr 
    WHERE kr.team_objective_id = o.id AND kr.cancelled_at IS NULL
  );
  GET DIAGNOSTICS obj_count = ROW_COUNT;
  
  UPDATE teams t
  SET member_count = (
    SELECT COUNT(*) 
    FROM user_team_memberships m 
    WHERE m.team_id = t.id
  )
  WHERE member_count IS DISTINCT FROM (
    SELECT COUNT(*) 
    FROM user_team_memberships m 
    WHERE m.team_id = t.id
  );
  GET DIAGNOSTICS team_count = ROW_COUNT;
  
  RETURN QUERY SELECT obj_count, team_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Criar função de retenção para okr_wizard_sessions
CREATE OR REPLACE FUNCTION cleanup_old_wizard_sessions()
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM okr_wizard_sessions 
  WHERE updated_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Comentários
COMMENT ON COLUMN okr_team_objectives.kr_count IS 'Contagem de KRs ativos (atualizado via trigger)';
COMMENT ON COLUMN okr_team_objectives.avg_progress IS 'Progresso médio dos KRs (cache, atualizado via cron)';
COMMENT ON COLUMN teams.member_count IS 'Contagem de membros do time (atualizado via trigger)';
COMMENT ON FUNCTION cleanup_old_wizard_sessions() IS 'Limpa sessões de wizard antigas (>90 dias)';
COMMENT ON FUNCTION initialize_counting_columns() IS 'Recalcula contagens - executar via Dashboard SQL';