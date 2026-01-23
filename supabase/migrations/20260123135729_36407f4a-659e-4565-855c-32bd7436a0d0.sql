-- ============================================================================
-- Fix ticket notifications to include ALL participants (internal + external watchers)
-- Gap identified: External watchers (partner_contacts in ticket_participants) 
-- were not receiving notifications for messages, status changes, and ticket creation
-- ============================================================================

-- 1. Enhanced notify_ticket_created: Also notify assigned external contact
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_creator_name TEXT;
  v_creator_auth_id UUID;
  v_owner_auth_id UUID;
  v_contact_auth_id UUID;
  v_recipients UUID[];
BEGIN
  -- Only on INSERT
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Get creator info (try internal profile first, then external contact)
  SELECT COALESCE(p.display_name, 'Alguém'), p.user_id
  INTO v_creator_name, v_creator_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.created_by_user_id;
  
  IF v_creator_auth_id IS NULL THEN
    SELECT COALESCE(pc.name, 'Contato'), pc.user_id
    INTO v_creator_name, v_creator_auth_id
    FROM public.partner_contacts pc
    WHERE pc.id = NEW.created_by_user_id;
  END IF;
  
  -- Initialize recipients
  v_recipients := ARRAY[]::UUID[];
  
  -- 1. Internal owner (if assigned and not the creator)
  IF NEW.owner_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_owner_auth_id
    FROM public.profiles p
    WHERE p.id = NEW.owner_user_id
      AND p.user_id IS NOT NULL;
    
    IF v_owner_auth_id IS NOT NULL AND v_owner_auth_id IS DISTINCT FROM v_creator_auth_id THEN
      v_recipients := ARRAY_APPEND(v_recipients, v_owner_auth_id);
    END IF;
  END IF;
  
  -- 2. External assigned contact (if assigned and not the creator)
  IF NEW.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id INTO v_contact_auth_id
    FROM public.partner_contacts pc
    WHERE pc.id = NEW.assigned_contact_id
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;
    
    IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id IS DISTINCT FROM v_creator_auth_id THEN
      IF NOT (v_contact_auth_id = ANY(COALESCE(v_recipients, ARRAY[]::UUID[]))) THEN
        v_recipients := ARRAY_APPEND(v_recipients, v_contact_auth_id);
      END IF;
    END IF;
  END IF;
  
  -- Exit if no recipients
  IF ARRAY_LENGTH(v_recipients, 1) IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification event
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.created',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_creator_auth_id,
    p_title := 'Novo ticket criado',
    p_message := COALESCE(NEW.title, 'Sem título'),
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'ticket_title', NEW.title,
      'creator_name', v_creator_name
    )
  );
  
  RETURN NEW;
END;
$$;

-- 2. Enhanced notify_ticket_message_created: Include external watchers from ticket_participants
CREATE OR REPLACE FUNCTION public.notify_ticket_message_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket RECORD;
  v_author_name TEXT;
  v_author_auth_id UUID;
  v_recipients UUID[];
  v_contact_auth_id UUID;
  v_owner_auth_id UUID;
  v_message_snippet TEXT;
  v_body_text TEXT;
  v_context_url TEXT;
BEGIN
  -- Skip system messages
  IF NEW.author_type = 'system' THEN
    RETURN NEW;
  END IF;

  -- Get ticket info including owner
  SELECT t.id, t.bu_id, t.title, t.assigned_contact_id, t.owner_user_id
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

  -- Extract text from body_richtext JSONB
  IF NEW.body_richtext IS NOT NULL THEN
    v_body_text := NEW.body_richtext->>'content';
    IF v_body_text IS NULL AND jsonb_typeof(NEW.body_richtext->'content') = 'array' THEN
      v_body_text := NEW.body_richtext->'content'->0->'content'->0->>'text';
    END IF;
  END IF;

  -- Create message snippet (max 200 chars)
  v_message_snippet := LEFT(COALESCE(v_body_text, ''), 200);
  IF LENGTH(COALESCE(v_body_text, '')) > 200 THEN
    v_message_snippet := v_message_snippet || '...';
  END IF;

  -- Build context URL for deep linking
  v_context_url := '/go/ticket/' || NEW.ticket_id::TEXT;

  -- Initialize recipients array
  v_recipients := ARRAY[]::UUID[];

  -- 1. Internal owner's auth_user_id
  IF v_ticket.owner_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_owner_auth_id
    FROM public.profiles p
    WHERE p.id = v_ticket.owner_user_id
      AND p.user_id IS NOT NULL;

    IF v_owner_auth_id IS NOT NULL AND v_owner_auth_id IS DISTINCT FROM v_author_auth_id THEN
      v_recipients := ARRAY_APPEND(v_recipients, v_owner_auth_id);
    END IF;
  END IF;

  -- 2. All INTERNAL participants from ticket_participants (watchers + creator)
  SELECT ARRAY_AGG(DISTINCT combined.user_id)
  INTO v_recipients
  FROM (
    SELECT UNNEST(v_recipients) as user_id
    UNION
    SELECT p.user_id
    FROM public.ticket_participants tp
    JOIN public.profiles p ON p.id = tp.profile_id
    WHERE tp.ticket_id = NEW.ticket_id
      AND tp.is_active = TRUE
      AND tp.participant_type = 'internal_user'
      AND p.user_id IS NOT NULL
      AND p.user_id IS DISTINCT FROM v_author_auth_id
  ) combined
  WHERE combined.user_id IS NOT NULL;

  -- 3. All EXTERNAL participants from ticket_participants (watchers)
  -- NEW: Include partner_contact watchers who are NOT the author
  SELECT ARRAY_AGG(DISTINCT combined.user_id)
  INTO v_recipients
  FROM (
    SELECT UNNEST(COALESCE(v_recipients, ARRAY[]::UUID[])) as user_id
    UNION
    SELECT pc.user_id
    FROM public.ticket_participants tp
    JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
    WHERE tp.ticket_id = NEW.ticket_id
      AND tp.is_active = TRUE
      AND tp.participant_type = 'partner_contact'
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL
      AND pc.user_id IS DISTINCT FROM v_author_auth_id
  ) combined
  WHERE combined.user_id IS NOT NULL;

  -- 4. Assigned external contact (responsible, if not already included)
  IF v_ticket.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id
    INTO v_contact_auth_id
    FROM public.partner_contacts pc
    WHERE pc.id = v_ticket.assigned_contact_id
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;

    IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id IS DISTINCT FROM v_author_auth_id THEN
      IF NOT (v_contact_auth_id = ANY(COALESCE(v_recipients, ARRAY[]::UUID[]))) THEN
        v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
      END IF;
    END IF;
  END IF;

  -- Exit if no recipients
  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Emit notification event
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.message.created',
    p_bu_id := v_ticket.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_author_auth_id,
    p_title := v_author_name || ' respondeu no ticket',
    p_message := v_message_snippet,
    p_context_type := 'ticket',
    p_context_id := NEW.ticket_id,
    p_context_url := v_context_url,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'ticket_title', v_ticket.title,
      'message_id', NEW.id,
      'author_name', v_author_name,
      'message', v_message_snippet
    )
  );

  RETURN NEW;
END;
$$;

-- 3. Enhanced notify_ticket_status_changed: Include external watchers from ticket_participants
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Get actor info (who changed the status)
  SELECT p.display_name, p.user_id 
  INTO v_actor_name, v_actor_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.owner_user_id;
  
  v_actor_name := COALESCE(v_actor_name, 'Alguém');
  
  -- 1. All INTERNAL participants' auth_user_ids
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
  WHERE tp.ticket_id = NEW.id
    AND tp.is_active = TRUE
    AND tp.participant_type = 'internal_user'
    AND p.user_id IS NOT NULL
    AND (v_actor_auth_id IS NULL OR p.user_id != v_actor_auth_id);
  
  -- 2. All EXTERNAL participants (watchers) from ticket_participants
  -- NEW: Include partner_contact watchers
  SELECT ARRAY_AGG(DISTINCT combined.user_id)
  INTO v_recipients
  FROM (
    SELECT UNNEST(COALESCE(v_recipients, ARRAY[]::UUID[])) as user_id
    UNION
    SELECT pc.user_id
    FROM public.ticket_participants tp
    JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
    WHERE tp.ticket_id = NEW.id
      AND tp.is_active = TRUE
      AND tp.participant_type = 'partner_contact'
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL
      AND (v_actor_auth_id IS NULL OR pc.user_id != v_actor_auth_id)
  ) combined
  WHERE combined.user_id IS NOT NULL;
  
  -- 3. Assigned external contact (if not already included)
  IF NEW.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id 
    INTO v_contact_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = NEW.assigned_contact_id
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;
    
    IF v_contact_auth_id IS NOT NULL AND (v_actor_auth_id IS NULL OR v_contact_auth_id != v_actor_auth_id) THEN
      IF NOT (v_contact_auth_id = ANY(COALESCE(v_recipients, ARRAY[]::UUID[]))) THEN
        v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
      END IF;
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
    p_title := 'Status do ticket alterado',
    p_message := 'Ticket "' || COALESCE(v_ticket_title, 'Sem título') || '" foi alterado para ' || v_new_status,
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'title', COALESCE(v_ticket_title, 'Sem título'),
      'old_status', v_old_status,
      'new_status', v_new_status,
      'actor_name', v_actor_name
    )
  );
  
  RETURN NEW;
END;
$$;

-- Add comments documenting the fix
COMMENT ON FUNCTION public.notify_ticket_created IS 'Notifies owner AND assigned external contact when ticket is created. v2: Now includes assigned_contact_id.';
COMMENT ON FUNCTION public.notify_ticket_message_created IS 'Notifies ALL participants (internal + external watchers) when message is added. v2: Now includes partner_contact participants.';
COMMENT ON FUNCTION public.notify_ticket_status_changed IS 'Notifies ALL participants (internal + external watchers) when status changes. v2: Now includes partner_contact participants.';