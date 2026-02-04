-- ============================================================
-- v2.86.0: KPI Target History - Governança de Metas
-- 
-- Cria tabela para histórico automático de alterações de metas
-- e trigger para capturar alterações silenciosamente.
-- ============================================================

-- 1. Criar tabela de histórico de metas
CREATE TABLE public.kpi_target_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID NOT NULL REFERENCES public.kpi_metrics(id) ON DELETE CASCADE,
  bu_id UUID REFERENCES public.bu_units(id),
  
  -- Valores antes/depois
  old_target_value NUMERIC,
  new_target_value NUMERIC,
  old_target_source TEXT,
  new_target_source TEXT,
  
  -- Auditoria
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.kpi_target_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Membros da BU podem visualizar histórico
CREATE POLICY "kpi_target_history_select"
ON public.kpi_target_history
FOR SELECT
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
);

-- 4. Índices para performance
CREATE INDEX idx_kpi_target_history_kpi_id ON public.kpi_target_history(kpi_id);
CREATE INDEX idx_kpi_target_history_changed_at ON public.kpi_target_history(changed_at DESC);

-- 5. Função que registra alterações de target (SECURITY DEFINER para bypass RLS)
CREATE OR REPLACE FUNCTION public.fn_kpi_target_history_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Só registra se target_value ou target_source mudou
  IF (
    OLD.target_value IS DISTINCT FROM NEW.target_value OR
    OLD.target_source IS DISTINCT FROM NEW.target_source
  ) THEN
    -- Obter profile_id do usuário atual
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE auth_uid = auth.uid()
    LIMIT 1;
    
    INSERT INTO public.kpi_target_history (
      kpi_id,
      bu_id,
      old_target_value,
      new_target_value,
      old_target_source,
      new_target_source,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      NEW.bu_id,
      OLD.target_value,
      NEW.target_value,
      OLD.target_source,
      NEW.target_source,
      v_profile_id,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Trigger para capturar alterações automaticamente
CREATE TRIGGER trg_kpi_target_history
AFTER UPDATE ON public.kpi_metrics
FOR EACH ROW
EXECUTE FUNCTION public.fn_kpi_target_history_trigger();

-- 7. Comentários para documentação
COMMENT ON TABLE public.kpi_target_history IS 'v2.86.0: Histórico automático de alterações de metas/benchmarks de KPIs';
COMMENT ON COLUMN public.kpi_target_history.old_target_value IS 'Valor da meta antes da alteração';
COMMENT ON COLUMN public.kpi_target_history.new_target_value IS 'Novo valor da meta após alteração';
COMMENT ON COLUMN public.kpi_target_history.old_target_source IS 'Fonte/justificativa da meta antes da alteração';
COMMENT ON COLUMN public.kpi_target_history.new_target_source IS 'Nova fonte/justificativa da meta';
COMMENT ON COLUMN public.kpi_target_history.changed_by IS 'Usuário que realizou a alteração';
COMMENT ON COLUMN public.kpi_target_history.changed_at IS 'Timestamp da alteração';