-- Etapa 1: Backfill (bypass do trigger de BU scope, pois roda como service role sem contexto de usuário)
SET LOCAL session_replication_role = 'replica';

UPDATE public.kpi_metrics
SET lifecycle_status = 'deprecated'
WHERE status = 'inactive'
  AND lifecycle_status <> 'deprecated'
  AND deleted_at IS NULL;

SET LOCAL session_replication_role = 'origin';

-- Etapa 2: Trigger de sincronização bidirecional status <-> lifecycle_status
CREATE OR REPLACE FUNCTION public.kpi_metrics_sync_status_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_status = 'deprecated' THEN
      NEW.status := 'inactive';
    ELSIF NEW.status = 'inactive' AND NEW.lifecycle_status IN ('active','proposed','observing') THEN
      NEW.lifecycle_status := 'deprecated';
    ELSIF NEW.lifecycle_status IN ('active','proposed','observing') AND NEW.status IS NULL THEN
      NEW.status := 'active';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    IF NEW.lifecycle_status = 'deprecated' THEN
      NEW.status := 'inactive';
    ELSIF NEW.lifecycle_status IN ('active','proposed','observing')
          AND NEW.status IS NOT DISTINCT FROM OLD.status
          AND OLD.status = 'inactive' THEN
      NEW.status := 'active';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'inactive'
       AND NEW.lifecycle_status IS NOT DISTINCT FROM OLD.lifecycle_status
       AND OLD.lifecycle_status IN ('active','proposed','observing') THEN
      NEW.lifecycle_status := 'deprecated';
    ELSIF NEW.status = 'active'
          AND NEW.lifecycle_status IS NOT DISTINCT FROM OLD.lifecycle_status
          AND OLD.lifecycle_status = 'deprecated' THEN
      NEW.lifecycle_status := 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kpi_metrics_sync_status_lifecycle ON public.kpi_metrics;
CREATE TRIGGER trg_kpi_metrics_sync_status_lifecycle
  BEFORE INSERT OR UPDATE OF status, lifecycle_status ON public.kpi_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.kpi_metrics_sync_status_lifecycle();

COMMENT ON COLUMN public.kpi_metrics.status IS
  '@deprecated — mantido por trigger trg_kpi_metrics_sync_status_lifecycle. Toda lógica nova deve ler/escrever lifecycle_status (SSOT canônico).';
COMMENT ON COLUMN public.kpi_metrics.lifecycle_status IS
  'SSOT canônico de ciclo de vida do KPI: proposed | active | observing | deprecated. Sincronizado com status (legado) via trigger.';