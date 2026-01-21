
-- =============================================================
-- FIX: Corrigir lógica de notificação para contatos externos
-- O profile_user_id já É o auth.users.id, não precisa de JOIN
-- =============================================================

-- 1. Corrigir notify_ticket_status_changed
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ticket_code TEXT;
  v_ticket_subject TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_recipients UUID[];
  v_actor_name TEXT;
  v_actor_auth_id UUID;
  v_contact_auth_id UUID;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket info
  v_ticket_code := NEW.code;
  v_ticket_subject := NEW.subject;
  v_old_status := OLD.status;
  v_new_status := NEW.status;
  
  -- Get actor info (profile_id -> auth.users.id)
  SELECT p.display_name, p.user_id 
  INTO v_actor_name, v_actor_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.updated_by;
  
  -- Get all internal participants' auth_user_ids (excluding the actor)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
  WHERE tp.ticket_id = NEW.id
    AND tp.is_active = TRUE
    AND p.user_id IS NOT NULL
    AND (v_actor_auth_id IS NULL OR p.user_id != v_actor_auth_id);
  
  -- Also include external contact if exists
  -- FIX: profile_user_id IS the auth.users.id directly, no JOIN needed
  IF NEW.contact_id IS NOT NULL THEN
    SELECT pc.profile_user_id 
    INTO v_contact_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = NEW.contact_id
      AND pc.profile_user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;
    
    -- Add to recipients if not the actor
    IF v_contact_auth_id IS NOT NULL AND (v_actor_auth_id IS NULL OR v_contact_auth_id != v_actor_auth_id) THEN
      v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
    END IF;
  END IF;
  
  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.status.changed',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_actor_auth_id,
    p_title := 'Status do ticket alterado para ' || v_new_status,
    p_message := v_ticket_code || ': ' || COALESCE(v_ticket_subject, 'Sem assunto'),
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/tickets/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'ticket_code', v_ticket_code,
      'old_status', v_old_status,
      'new_status', v_new_status
    )
  );
  
  RETURN NEW;
END;
$$;

-- 2. Corrigir notify_ticket_message_created
CREATE OR REPLACE FUNCTION public.notify_ticket_message_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ticket RECORD;
  v_author_name TEXT;
  v_author_auth_id UUID;
  v_recipients UUID[];
  v_contact_auth_id UUID;
BEGIN
  -- Get ticket info
  SELECT t.id, t.bu_id, t.code, t.subject, t.contact_id
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = NEW.ticket_id;
  
  IF v_ticket.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get author info (profile_id -> auth.users.id)
  SELECT COALESCE(p.display_name, 'Alguém'), p.user_id 
  INTO v_author_name, v_author_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.author_id;
  
  -- Get all internal participants' auth_user_ids (excluding the author)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
  WHERE tp.ticket_id = NEW.ticket_id
    AND tp.is_active = TRUE
    AND p.user_id IS NOT NULL
    AND (v_author_auth_id IS NULL OR p.user_id != v_author_auth_id);
  
  -- Also include external contact if exists (and is not the author)
  -- FIX: profile_user_id IS the auth.users.id directly, no JOIN needed
  IF v_ticket.contact_id IS NOT NULL THEN
    SELECT pc.profile_user_id 
    INTO v_contact_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = v_ticket.contact_id
      AND pc.profile_user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;
    
    -- Add to recipients if not the author
    IF v_contact_auth_id IS NOT NULL AND (v_author_auth_id IS NULL OR v_contact_auth_id != v_author_auth_id) THEN
      v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
    END IF;
  END IF;
  
  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.message.created',
    p_bu_id := v_ticket.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_author_auth_id,
    p_title := v_author_name || ' enviou uma mensagem',
    p_message := v_ticket.code || ': ' || COALESCE(v_ticket.subject, 'Sem assunto'),
    p_context_type := 'ticket_message',
    p_context_id := NEW.id,
    p_context_url := '/tickets/' || NEW.ticket_id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'ticket_code', v_ticket.code,
      'message_id', NEW.id,
      'author_name', v_author_name
    )
  );
  
  RETURN NEW;
END;
$$;

-- Comentário de auditoria
COMMENT ON FUNCTION public.notify_ticket_status_changed IS 'Notifica participantes (internos e externos) sobre mudança de status. Fix: profile_user_id é o auth.users.id diretamente.';
COMMENT ON FUNCTION public.notify_ticket_message_created IS 'Notifica participantes (internos e externos) sobre novas mensagens. Fix: profile_user_id é o auth.users.id diretamente.';
