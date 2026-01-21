-- =====================================================
-- Migration: Ativar sistema de menções para contatos externos
-- =====================================================

-- 1. Trigger para auto-adicionar participante quando mencionado
DROP TRIGGER IF EXISTS trg_auto_add_ticket_mention_as_participant ON public.mentions;
CREATE TRIGGER trg_auto_add_ticket_mention_as_participant
AFTER INSERT ON public.mentions
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_ticket_mention_as_participant();

-- 2. Refatorar função de notificação para usar emit_notification_event
CREATE OR REPLACE FUNCTION public.notify_ticket_mention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
  v_ticket_title text;
  v_author_name text;
  v_context_url text;
  v_bu_id uuid;
  v_recipient_auth_id uuid;
  v_author_auth_id uuid;
BEGIN
  -- Only process ticket-related mentions
  IF NEW.entity_type NOT IN ('ticket_message', 'ticket') THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket info based on entity type
  IF NEW.entity_type = 'ticket_message' THEN
    SELECT tm.ticket_id, t.title, t.bu_id 
    INTO v_ticket_id, v_ticket_title, v_bu_id
    FROM public.ticket_messages tm
    JOIN public.tickets t ON t.id = tm.ticket_id
    WHERE tm.id = NEW.entity_id;
  ELSE
    SELECT id, title, bu_id 
    INTO v_ticket_id, v_ticket_title, v_bu_id
    FROM public.tickets 
    WHERE id = NEW.entity_id;
  END IF;
  
  IF v_ticket_id IS NULL THEN 
    RETURN NEW; 
  END IF;
  
  -- Get author info (profile_id -> auth.users.id)
  SELECT COALESCE(display_name, email), user_id 
  INTO v_author_name, v_author_auth_id
  FROM public.profiles 
  WHERE id = NEW.created_by;
  
  v_context_url := '/tickets/' || v_ticket_id::text;
  
  -- Resolve recipient auth.users.id based on mention type
  IF NEW.mentioned_user_id IS NOT NULL THEN
    -- Internal user: get auth.users.id from profiles
    SELECT user_id INTO v_recipient_auth_id
    FROM public.profiles 
    WHERE id = NEW.mentioned_user_id;
  ELSIF NEW.mentioned_contact_id IS NOT NULL THEN
    -- External contact: get auth.users.id from partner_contacts.profile_user_id
    SELECT pc.profile_user_id INTO v_recipient_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = NEW.mentioned_contact_id;
  END IF;
  
  -- Skip if no recipient found or self-mention
  IF v_recipient_auth_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF v_recipient_auth_id = v_author_auth_id THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification via centralized system (handles email + in_app)
  PERFORM emit_notification_event(
    'mention.created',
    v_bu_id,
    ARRAY[v_recipient_auth_id],
    v_author_auth_id,
    COALESCE(v_author_name, 'Alguém') || ' mencionou você',
    'em um ticket: ' || COALESCE(v_ticket_title, 'Sem título'),
    'ticket',
    v_ticket_id,
    v_context_url,
    jsonb_build_object('mention_id', NEW.id, 'ticket_id', v_ticket_id)
  );
  
  RETURN NEW;
END;
$$;

-- 3. Trigger para notificar quando mencionado
DROP TRIGGER IF EXISTS trg_notify_ticket_mention ON public.mentions;
CREATE TRIGGER trg_notify_ticket_mention
AFTER INSERT ON public.mentions
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_mention();

-- 4. Adicionar comentários para documentação
COMMENT ON TRIGGER trg_auto_add_ticket_mention_as_participant ON public.mentions IS 
'Auto-adiciona usuário/contato mencionado como participante do ticket (role: watcher)';

COMMENT ON TRIGGER trg_notify_ticket_mention ON public.mentions IS 
'Notifica usuário/contato mencionado via sistema centralizado (email + in_app)';