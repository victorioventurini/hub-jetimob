-- =============================================
-- Adicionar suporte a mensagens fixadas em tickets
-- =============================================

-- 1. Adicionar colunas para mensagens fixadas
ALTER TABLE public.ticket_messages
ADD COLUMN is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN pinned_at timestamptz,
ADD COLUMN pinned_by_user_id uuid REFERENCES public.profiles(id);

-- 2. Comentários de documentação (seguindo convenção de identidade)
COMMENT ON COLUMN public.ticket_messages.is_pinned IS 'Se a mensagem está fixada no topo do ticket';
COMMENT ON COLUMN public.ticket_messages.pinned_at IS 'Data/hora em que a mensagem foi fixada';
COMMENT ON COLUMN public.ticket_messages.pinned_by_user_id IS 'ID do profile (profiles.id) que fixou a mensagem';

-- 3. Índice para busca eficiente de mensagens fixadas
CREATE INDEX idx_ticket_messages_pinned ON public.ticket_messages(ticket_id, is_pinned) WHERE is_pinned = true;

-- 4. Função para validar se usuário pode fixar mensagem
-- Regra: apenas created_by_user_id OU owner_user_id do ticket (ou assigned_contact para externos)
CREATE OR REPLACE FUNCTION public.can_pin_ticket_message(
  p_ticket_id uuid,
  p_profile_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ticket RECORD;
  v_contact_profile_id uuid;
BEGIN
  -- Buscar ticket
  SELECT created_by_user_id, owner_user_id, assigned_contact_id, type
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL;
  
  IF v_ticket IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se é criador ou owner
  IF v_ticket.created_by_user_id = p_profile_id OR v_ticket.owner_user_id = p_profile_id THEN
    RETURN true;
  END IF;
  
  -- Para tickets externos, verificar se é o contato assignee
  IF v_ticket.type = 'external' AND v_ticket.assigned_contact_id IS NOT NULL THEN
    -- Buscar profile_user_id do contato
    SELECT pc.profile_user_id INTO v_contact_profile_id
    FROM public.partner_contacts pc
    WHERE pc.id = v_ticket.assigned_contact_id;
    
    -- Se o contato tem user vinculado, verificar se é o profile do usuário
    IF v_contact_profile_id IS NOT NULL THEN
      SELECT id INTO v_contact_profile_id
      FROM public.profiles
      WHERE user_id = v_contact_profile_id;
      
      IF v_contact_profile_id = p_profile_id THEN
        RETURN true;
      END IF;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_pin_ticket_message IS 'Verifica se um usuário pode fixar mensagens em um ticket (deve ser criador, owner ou assignee externo)';

-- 5. Trigger para validar pinning no UPDATE
CREATE OR REPLACE FUNCTION public.validate_message_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_caller_profile_id uuid;
BEGIN
  -- Se is_pinned não mudou, permite
  IF OLD.is_pinned = NEW.is_pinned THEN
    RETURN NEW;
  END IF;
  
  -- Obter profile_id do caller
  v_caller_profile_id := my_profile_id();
  
  IF v_caller_profile_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar permissão
  IF NOT can_pin_ticket_message(NEW.ticket_id, v_caller_profile_id) THEN
    RAISE EXCEPTION 'Apenas o criador ou responsável do ticket pode fixar mensagens';
  END IF;
  
  -- Se está fixando, registrar quem e quando
  IF NEW.is_pinned = true AND OLD.is_pinned = false THEN
    NEW.pinned_at := now();
    NEW.pinned_by_user_id := v_caller_profile_id;
  END IF;
  
  -- Se está desfixando, limpar campos
  IF NEW.is_pinned = false AND OLD.is_pinned = true THEN
    NEW.pinned_at := NULL;
    NEW.pinned_by_user_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_message_pin
  BEFORE UPDATE OF is_pinned ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message_pin();