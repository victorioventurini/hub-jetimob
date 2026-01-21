-- Migração: Corrigir context_url em notificações de tickets para suporte multi-BU
-- De: '/tickets/{id}' Para: '/go/ticket/{id}'
-- Isso permite que ResolveContextPage troque a BU automaticamente

-- 1. notify_ticket_status_changed
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
  
  -- Emit notification with corrected context_url
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.status.changed',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_actor_auth_id,
    p_title := 'Status do ticket alterado para ' || v_new_status,
    p_message := v_ticket_code || ': ' || COALESCE(v_ticket_subject, 'Sem assunto'),
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,  -- FIXED: was '/tickets/'
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
  
  -- Emit notification with corrected context_url
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.message.created',
    p_bu_id := v_ticket.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_author_auth_id,
    p_title := v_author_name || ' respondeu no ticket',
    p_message := v_ticket.code || ': ' || COALESCE(v_ticket.subject, 'Sem assunto'),
    p_context_type := 'ticket',
    p_context_id := NEW.ticket_id,
    p_context_url := '/go/ticket/' || NEW.ticket_id,  -- FIXED: was '/tickets/'
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'ticket_code', v_ticket.code,
      'message_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;


-- 3. notify_ticket_assigned
CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ticket_code TEXT;
  v_ticket_subject TEXT;
  v_actor_name TEXT;
  v_auth_user_id UUID;
BEGIN
  -- Only trigger on assignee change
  IF OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN
    RETURN NEW;
  END IF;
  
  -- Only notify if new assignee exists
  IF NEW.assignee_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket info
  SELECT code, subject INTO v_ticket_code, v_ticket_subject
  FROM public.tickets
  WHERE id = NEW.id;
  
  -- Get actor name (who assigned)
  SELECT display_name INTO v_actor_name
  FROM public.profiles
  WHERE id = NEW.updated_by;
  
  -- Get auth_user_id for recipient
  SELECT user_id INTO v_auth_user_id
  FROM public.profiles
  WHERE id = NEW.assignee_id;
  
  IF v_auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification with corrected context_url
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.assigned',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := ARRAY[v_auth_user_id],
    p_actor_id := NEW.updated_by,
    p_title := COALESCE(v_actor_name, 'Alguém') || ' atribuiu um ticket a você',
    p_message := v_ticket_code || ': ' || COALESCE(v_ticket_subject, 'Sem assunto'),
    p_context_type := 'ticket',
    p_context_id := NEW.id::TEXT,
    p_context_url := '/go/ticket/' || NEW.id,  -- FIXED: was '/tickets/'
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'ticket_code', v_ticket_code,
      'assignee_name', (SELECT display_name FROM profiles WHERE id = NEW.assignee_id)
    )
  );
  
  RETURN NEW;
END;
$$;


-- 4. notify_ticket_mention
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
  
  -- FIXED: was '/tickets/'
  v_context_url := '/go/ticket/' || v_ticket_id::text;
  
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


-- 5. trg_notify_external_contact_on_ticket_assignment (adicionar context_url)
CREATE OR REPLACE FUNCTION public.trg_notify_external_contact_on_ticket_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact RECORD;
  v_ticket RECORD;
  v_event_slug TEXT;
  v_context_url TEXT;
BEGIN
  -- Only for assignee role on partner_contact participant type
  IF NEW.role = 'assignee' AND NEW.participant_type = 'partner_contact' AND NEW.partner_contact_id IS NOT NULL THEN
    -- Get contact info
    SELECT id, name, email, user_id INTO v_contact
    FROM partner_contacts
    WHERE id = NEW.partner_contact_id;
    
    -- Get ticket info
    SELECT id, title, type INTO v_ticket
    FROM tickets
    WHERE id = NEW.ticket_id;
    
    IF v_contact.id IS NOT NULL AND v_ticket.id IS NOT NULL THEN
      v_event_slug := 'ticket.assigned_to_external';
      v_context_url := '/go/ticket/' || v_ticket.id;  -- Multi-BU safe URL
      
      -- Insert email notification to outbox
      INSERT INTO notification_outbox (
        bu_id,
        user_id,
        event_slug,
        channel_slug,
        payload,
        status
      ) VALUES (
        NEW.bu_id,
        v_contact.user_id,
        v_event_slug,
        'email',
        jsonb_build_object(
          'ticket_id', v_ticket.id,
          'ticket_title', v_ticket.title,
          'contact_name', v_contact.name,
          'contact_email', v_contact.email,
          'contact_id', v_contact.id,
          'context_url', v_context_url
        ),
        'pending'
      );
      
      -- Insert in-app notification if contact has user_id
      IF v_contact.user_id IS NOT NULL THEN
        INSERT INTO notification_outbox (
          bu_id,
          user_id,
          event_slug,
          channel_slug,
          payload,
          status
        ) VALUES (
          NEW.bu_id,
          v_contact.user_id,
          v_event_slug,
          'in_app',
          jsonb_build_object(
            'ticket_id', v_ticket.id,
            'ticket_title', v_ticket.title,
            'contact_name', v_contact.name,
            'contact_id', v_contact.id,
            'context_url', v_context_url
          ),
          'pending'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


COMMENT ON FUNCTION public.notify_ticket_status_changed IS 'Notifies participants when ticket status changes. Uses /go/ticket/ for multi-BU context resolution.';
COMMENT ON FUNCTION public.notify_ticket_message_created IS 'Notifies participants when new message is added. Uses /go/ticket/ for multi-BU context resolution.';
COMMENT ON FUNCTION public.notify_ticket_assigned IS 'Notifies assignee when ticket is assigned. Uses /go/ticket/ for multi-BU context resolution.';
COMMENT ON FUNCTION public.notify_ticket_mention IS 'Notifies users when mentioned in tickets. Uses /go/ticket/ for multi-BU context resolution.';
COMMENT ON FUNCTION public.trg_notify_external_contact_on_ticket_assignment IS 'Notifies external contact when assigned to ticket. Uses /go/ticket/ for multi-BU context resolution.';