-- Fix: Corrigir referência incorreta 'auth_uid' → usar função canônica my_profile_id()
-- Contexto: O trigger usava WHERE auth_uid = auth.uid(), mas a coluna correta é user_id
-- Solução: Usar my_profile_id() conforme IDENTITY_CONVENTION

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
    -- Obter profile_id usando função canônica (IDENTITY_CONVENTION)
    v_profile_id := my_profile_id();
    
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