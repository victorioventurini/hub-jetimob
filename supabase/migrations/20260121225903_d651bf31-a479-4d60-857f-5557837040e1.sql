-- Migration: Corrigir funções de notificação de tickets que usavam colunas inexistentes
-- Colunas corretas: title (não subject), assigned_contact_id (não contact_id), owner_user_id (não assignee_id)
-- Não existem: code, subject, contact_id, assignee_id, updated_by

-- 1. notify_ticket_status_changed (trigger AFTER UPDATE on tickets)
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
  
  -- Get ticket info (using correct column names)
  v_ticket_title := NEW.title;
  v_old_status := OLD.status::TEXT;
  v_new_status := NEW.status::TEXT;
  
  -- Get actor info: We don't have updated_by column, use owner_user_id as fallback
  -- In a proper implementation, this would be passed via context
  SELECT p.display_name, p.user_id 
  INTO v_actor_name, v_actor_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.owner_user_id;
  
  -- Get all internal participants' auth_user_ids (excluding the actor)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
  WHERE tp.ticket_id = NEW.id
    AND tp.is_active = TRUE
    AND p.user_id IS NOT NULL
    AND (v_actor_auth_id IS NULL OR p.user_id != v_actor_auth_id);
  
  -- Also include external contact if exists (using correct column: assigned_contact_id)
  IF NEW.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id 
    INTO v_contact_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = NEW.assigned_contact_id
      AND pc.user_id IS NOT NULL
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


-- 2. notify_ticket_message_created (trigger AFTER INSERT on ticket_messages)
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
  -- Get ticket info (using correct column names: title, assigned_contact_id)
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
  IF v_ticket.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id 
    INTO v_contact_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = v_ticket.assigned_contact_id
      AND pc.user_id IS NOT NULL
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


-- 3. notify_ticket_assigned - Esta função tentava ler colunas inexistentes
-- tickets não tem assignee_id nem updated_by
-- Vamos usar owner_user_id como responsável e remover referências a updated_by
CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ticket_title TEXT;
  v_auth_user_id UUID;
BEGIN
  -- Only trigger on owner change (internal assignment)
  IF OLD.owner_user_id IS NOT DISTINCT FROM NEW.owner_user_id THEN
    RETURN NEW;
  END IF;
  
  -- Only notify if new owner exists
  IF NEW.owner_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket info
  v_ticket_title := NEW.title;
  
  -- Get auth_user_id for recipient
  SELECT user_id INTO v_auth_user_id
  FROM public.profiles
  WHERE id = NEW.owner_user_id;
  
  IF v_auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.assigned',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := ARRAY[v_auth_user_id],
    p_actor_id := NULL, -- We don't have updated_by info
    p_title := 'Um ticket foi atribuído a você',
    p_message := COALESCE(v_ticket_title, 'Sem título'),
    p_context_type := 'ticket',
    p_context_id := NEW.id::TEXT,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;


COMMENT ON FUNCTION public.notify_ticket_status_changed IS 'v2: Notifies participants when ticket status changes. Fixed column names (title not subject, assigned_contact_id not contact_id).';
COMMENT ON FUNCTION public.notify_ticket_message_created IS 'v2: Notifies participants when new message is added. Fixed column names and author detection for internal/external users.';
COMMENT ON FUNCTION public.notify_ticket_assigned IS 'v2: Notifies owner when ticket is assigned. Fixed to use owner_user_id instead of non-existent assignee_id.';