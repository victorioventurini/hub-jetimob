-- Fix: Permitir primeira atribuição de user_id (NULL -> valor)
-- O trigger atual bloqueia QUALQUER mudança, incluindo a primeira atribuição

CREATE OR REPLACE FUNCTION public.trg_protect_profile_critical_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Impedir alteração de user_id, MAS permitir primeira atribuição (NULL -> valor)
  IF OLD.user_id IS NOT NULL AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Não é permitido alterar user_id do profile';
  END IF;
  
  -- Impedir alteração de bu_id por client (exceto se chamado por trigger/function interna)
  IF OLD.bu_id IS DISTINCT FROM NEW.bu_id THEN
    -- Permitir apenas se for admin ou chamada interna
    IF NOT (is_platform_admin(auth.uid()) OR current_setting('app.internal_call', true) = 'true') THEN
      RAISE EXCEPTION 'Não é permitido alterar bu_id do profile diretamente. Use a gestão de BU.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.trg_protect_profile_critical_fields() IS 
'Protege campos críticos do profile:
- user_id: bloqueia alteração APÓS primeira atribuição (NULL->valor é permitido)
- bu_id: só admin ou chamada interna podem alterar';