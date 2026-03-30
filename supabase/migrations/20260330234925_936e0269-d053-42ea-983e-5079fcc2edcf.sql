-- Fase 5: Status formal nos ciclos de OKR

-- 1. Enum para status do ciclo
CREATE TYPE public.cycle_status AS ENUM ('planning', 'active', 'closed');

-- 2. Adicionar coluna status com default 'planning'
ALTER TABLE public.cycles 
  ADD COLUMN status public.cycle_status NOT NULL DEFAULT 'planning';

-- 3. Desabilitar trigger de BU scope temporariamente para migrar dados
ALTER TABLE public.cycles DISABLE TRIGGER trg_enforce_bu_scope_cycles;

-- 4. Migrar dados existentes baseado nas datas
UPDATE public.cycles SET status = (CASE
  WHEN now()::date BETWEEN start_date AND end_date THEN 'active'
  WHEN end_date < now()::date THEN 'closed'
  ELSE 'planning'
END)::public.cycle_status;

-- 5. Reabilitar trigger de BU scope
ALTER TABLE public.cycles ENABLE TRIGGER trg_enforce_bu_scope_cycles;

-- 6. Função de validação: no máximo 1 ciclo 'active' por BU+type
CREATE OR REPLACE FUNCTION public.validate_single_active_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF EXISTS (
      SELECT 1 FROM public.cycles
      WHERE bu_id = NEW.bu_id
        AND type = NEW.type
        AND status = 'active'
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Já existe um ciclo % ativo para esta BU', NEW.type;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Trigger para validar unicidade de ciclo ativo
CREATE TRIGGER trg_validate_single_active_cycle
  BEFORE INSERT OR UPDATE OF status ON public.cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_single_active_cycle();