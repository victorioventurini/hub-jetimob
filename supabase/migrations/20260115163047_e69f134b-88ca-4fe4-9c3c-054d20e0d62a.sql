-- ==============================================================
-- CASCADE CANCELLATION TRIGGERS
-- 1. Objetivo cancelado → cancela KRs e Iniciativas
-- 2. KR cancelada → cancela Iniciativas
-- ==============================================================

-- Função: Cascatear cancelamento de Objetivo para KRs e Iniciativas
CREATE OR REPLACE FUNCTION public.cascade_objective_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o objetivo está sendo cancelado (status mudou para 'cancelled' ou 'discarded', ou cancelled_at foi preenchido)
  IF (
    (NEW.status IN ('cancelled', 'discarded') AND OLD.status NOT IN ('cancelled', 'discarded'))
    OR (NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL)
  ) THEN
    -- Cancelar todas as KRs deste objetivo
    UPDATE okr_team_key_results
    SET 
      cancelled_at = COALESCE(NEW.cancelled_at, NOW()),
      updated_at = NOW()
    WHERE team_objective_id = NEW.id
      AND cancelled_at IS NULL
      AND deleted_at IS NULL;
    
    -- Cancelar todas as iniciativas das KRs deste objetivo
    UPDATE okr_initiatives
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE kr_id IN (
      SELECT id FROM okr_team_key_results WHERE team_objective_id = NEW.id
    )
    AND status != 'cancelled'
    AND deleted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para cancelamento de objetivos de time
DROP TRIGGER IF EXISTS trg_cascade_team_objective_cancellation ON okr_team_objectives;
CREATE TRIGGER trg_cascade_team_objective_cancellation
  AFTER UPDATE ON okr_team_objectives
  FOR EACH ROW
  EXECUTE FUNCTION cascade_objective_cancellation();

-- Função: Cascatear cancelamento de Objetivo Org para KRs
CREATE OR REPLACE FUNCTION public.cascade_org_objective_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o objetivo org está sendo cancelado
  IF (
    (NEW.status IN ('cancelled', 'discarded') AND OLD.status NOT IN ('cancelled', 'discarded'))
    OR (NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL)
  ) THEN
    -- Cancelar todas as KRs deste objetivo org
    UPDATE okr_org_key_results
    SET 
      cancelled_at = COALESCE(NEW.cancelled_at, NOW()),
      updated_at = NOW()
    WHERE org_objective_id = NEW.id
      AND cancelled_at IS NULL
      AND deleted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para cancelamento de objetivos organizacionais
DROP TRIGGER IF EXISTS trg_cascade_org_objective_cancellation ON okr_org_objectives;
CREATE TRIGGER trg_cascade_org_objective_cancellation
  AFTER UPDATE ON okr_org_objectives
  FOR EACH ROW
  EXECUTE FUNCTION cascade_org_objective_cancellation();

-- Função: Cascatear cancelamento de KR para Iniciativas
CREATE OR REPLACE FUNCTION public.cascade_kr_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se a KR está sendo cancelada (cancelled_at foi preenchido)
  IF (NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL) THEN
    -- Cancelar todas as iniciativas desta KR
    UPDATE okr_initiatives
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE kr_id = NEW.id
      AND status != 'cancelled'
      AND deleted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para cancelamento de KRs de time
DROP TRIGGER IF EXISTS trg_cascade_team_kr_cancellation ON okr_team_key_results;
CREATE TRIGGER trg_cascade_team_kr_cancellation
  AFTER UPDATE ON okr_team_key_results
  FOR EACH ROW
  EXECUTE FUNCTION cascade_kr_cancellation();

-- ==============================================================
-- COMENTÁRIOS EXPLICATIVOS
-- ==============================================================
COMMENT ON FUNCTION cascade_objective_cancellation() IS 
  'Cascateia cancelamento de objetivo de time para suas KRs e iniciativas';

COMMENT ON FUNCTION cascade_org_objective_cancellation() IS 
  'Cascateia cancelamento de objetivo organizacional para suas KRs';

COMMENT ON FUNCTION cascade_kr_cancellation() IS 
  'Cascateia cancelamento de KR de time para suas iniciativas';