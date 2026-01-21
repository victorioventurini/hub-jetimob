-- Migration: Corrigir funções de notificação para usar tp.user_id em vez de tp.profile_id
-- ticket_participants tem coluna user_id (não profile_id)

-- 1. notify_ticket_status_changed
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ticket_title TEXT;
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
  
  v_ticket_title := NEW.title;
  v_old_status := OLD.status::TEXT;
  v_new_status := NEW.status::TEXT;
  
  -- Get actor info
  SELECT p.display_name, p.user_id 
  INTO v_actor_name, v_actor_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.owner_user_id;
  
  -- Get all internal participants' auth_user_ids (FIXED: tp.user_id not tp.profile_id)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.user_id
  WHERE tp.ticket_id = NEW.id
    AND tp.is_active = TRUE
    AND tp.participant_type = 'internal_user'
    AND p.user_id IS NOT NULL
    AND (v_actor_auth_id IS NULL OR p.user_id != v_actor_auth_id);
  
  -- Include external contact if exists
  IF NEW.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id 
    INTO v_contact_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = NEW.assigned_contact_id
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;
    
    IF v_contact_auth_id IS NOT NULL AND (v_actor_auth_id IS NULL OR v_contact_auth_id != v_actor_auth_id) THEN
      v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
    END IF;
  END IF;
  
  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.status.changed',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_actor_auth_id,
    p_title := 'Status do ticket alterado para ' || v_new_status,
    p_message := COALESCE(v_ticket_title, 'Sem título'),
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'old_status', v_old_status,
      'new_status', v_new_status
    )
  );
  
  RETURN NEW;
END;
$$;


-- 2. notify_ticket_message_created
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
  SELECT t.id, t.bu_id, t.title, t.assigned_contact_id
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = NEW.ticket_id;
  
  IF v_ticket.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get author info based on author_type
  IF NEW.author_type = 'internal_user' AND NEW.author_user_id IS NOT NULL THEN
    SELECT COALESCE(p.display_name, 'Alguém'), p.user_id 
    INTO v_author_name, v_author_auth_id
    FROM public.profiles p
    WHERE p.id = NEW.author_user_id;
  ELSIF NEW.author_type = 'partner_contact' AND NEW.author_contact_id IS NOT NULL THEN
    SELECT COALESCE(pc.name, 'Contato'), pc.user_id
    INTO v_author_name, v_author_auth_id
    FROM public.partner_contacts pc
    WHERE pc.id = NEW.author_contact_id;
  ELSE
    v_author_name := 'Alguém';
  END IF;
  
  -- Get all internal participants' auth_user_ids (FIXED: tp.user_id not tp.profile_id)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.user_id
  WHERE tp.ticket_id = NEW.ticket_id
    AND tp.is_active = TRUE
    AND tp.participant_type = 'internal_user'
    AND p.user_id IS NOT NULL
    AND (v_author_auth_id IS NULL OR p.user_id != v_author_auth_id);
  
  -- Include external contact if exists (and is not the author)
  IF v_ticket.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id 
    INTO v_contact_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = v_ticket.assigned_contact_id
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;
    
    IF v_contact_auth_id IS NOT NULL AND (v_author_auth_id IS NULL OR v_contact_auth_id != v_author_auth_id) THEN
      v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
    END IF;
  END IF;
  
  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.message.created',
    p_bu_id := v_ticket.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_author_auth_id,
    p_title := v_author_name || ' respondeu no ticket',
    p_message := COALESCE(v_ticket.title, 'Sem título'),
    p_context_type := 'ticket',
    p_context_id := NEW.ticket_id,
    p_context_url := '/go/ticket/' || NEW.ticket_id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'message_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;


COMMENT ON FUNCTION public.notify_ticket_status_changed IS 'v3: Fixed tp.user_id (was tp.profile_id). Notifies participants on status change.';
COMMENT ON FUNCTION public.notify_ticket_message_created IS 'v3: Fixed tp.user_id (was tp.profile_id). Notifies participants on new message.';