-- ============================================================
-- FIX: Update all ticket functions/triggers referencing user_id → profile_id
-- TCR v2.51.0 - Identity Hardening v2.1
-- ============================================================

-- 1. Fix is_ticket_participant function
CREATE OR REPLACE FUNCTION public.is_ticket_participant(p_user_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ticket_participants tp
    WHERE tp.ticket_id = p_ticket_id
      AND tp.profile_id = p_user_id  -- FIXED: user_id → profile_id
      AND tp.is_active = true
  )
$$;

COMMENT ON FUNCTION public.is_ticket_participant(uuid, uuid) IS 
  'Checks if profile_id is an active participant in ticket. p_user_id is actually profile_id (legacy naming).';

-- 2. Fix auto_add_mention_as_participant trigger function
CREATE OR REPLACE FUNCTION public.auto_add_mention_as_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If mentioning internal user
  IF NEW.mentioned_user_id IS NOT NULL THEN
    INSERT INTO public.ticket_participants (
      bu_id,
      ticket_id,
      participant_type,
      profile_id,  -- FIXED: user_id → profile_id
      role,
      is_active
    )
    VALUES (
      NEW.bu_id,
      NEW.ticket_id,
      'internal_user',
      NEW.mentioned_user_id,
      'watcher',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- If mentioning external contact
  IF NEW.mentioned_contact_id IS NOT NULL THEN
    INSERT INTO public.ticket_participants (
      bu_id,
      ticket_id,
      participant_type,
      partner_contact_id,
      role,
      is_active
    )
    VALUES (
      NEW.bu_id,
      NEW.ticket_id,
      'partner_contact',
      NEW.mentioned_contact_id,
      'watcher',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_add_mention_as_participant() IS 
  'Trigger: Auto-adds mentioned users as ticket participants. Uses profile_id column.';

-- 3. Fix auto_add_ticket_mention_as_participant trigger function
CREATE OR REPLACE FUNCTION public.auto_add_ticket_mention_as_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket_id uuid;
  v_bu_id uuid;
BEGIN
  -- Only process ticket message mentions
  IF NEW.entity_type != 'ticket_message' THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket_id and bu_id from the message
  SELECT tm.ticket_id, t.bu_id INTO v_ticket_id, v_bu_id
  FROM public.ticket_messages tm
  JOIN public.tickets t ON t.id = tm.ticket_id
  WHERE tm.id = NEW.entity_id;
  
  IF v_ticket_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Add internal user as participant (watcher role)
  IF NEW.mentioned_user_id IS NOT NULL THEN
    INSERT INTO public.ticket_participants (
      bu_id, ticket_id, participant_type, profile_id, role, is_active  -- FIXED: user_id → profile_id
    )
    VALUES (
      v_bu_id, v_ticket_id, 'internal_user', 
      NEW.mentioned_user_id, 'watcher', true
    )
    ON CONFLICT (ticket_id, profile_id) WHERE profile_id IS NOT NULL  -- FIXED: user_id → profile_id
    DO UPDATE SET is_active = true, updated_at = now();
  END IF;
  
  -- Add external contact as participant (watcher role)
  IF NEW.mentioned_contact_id IS NOT NULL THEN
    INSERT INTO public.ticket_participants (
      bu_id, ticket_id, participant_type, partner_contact_id, role, is_active
    )
    VALUES (
      v_bu_id, v_ticket_id, 'partner_contact', 
      NEW.mentioned_contact_id, 'watcher', true
    )
    ON CONFLICT (ticket_id, partner_contact_id) WHERE partner_contact_id IS NOT NULL 
    DO UPDATE SET is_active = true, updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_add_ticket_mention_as_participant() IS 
  'Trigger: Auto-adds mentioned users in ticket messages as participants. Uses profile_id column.';

-- 4. Fix notify_ticket_message_created trigger function
CREATE OR REPLACE FUNCTION public.notify_ticket_message_created()
RETURNS trigger
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
  
  -- Get all internal participants' auth_user_ids
  -- FIXED: tp.profile_id instead of tp.user_id (column was renamed)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id  -- FIXED: user_id → profile_id
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

COMMENT ON FUNCTION public.notify_ticket_message_created() IS 
  'Trigger: Notifies ticket participants when a message is created. Uses tp.profile_id (Identity Hardening v2.1).';

-- 5. Fix notify_ticket_status_changed trigger function
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS trigger
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
  
  -- Get actor info
  SELECT p.display_name, p.user_id 
  INTO v_actor_name, v_actor_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.owner_user_id;
  
  -- Get all internal participants' auth_user_ids
  -- FIXED: tp.profile_id instead of tp.user_id (column was renamed)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id  -- FIXED: user_id → profile_id
  WHERE tp.ticket_id = NEW.id
    AND tp.is_active = TRUE
    AND tp.participant_type = 'internal_user'
    AND p.user_id IS NOT NULL
    AND (v_actor_auth_id IS NULL OR p.user_id != v_actor_auth_id);
  
  -- Include assigned external contact if exists (and is not the actor)
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
    p_title := 'Status do ticket alterado',
    p_message := 'Ticket "' || COALESCE(v_ticket_title, 'Sem título') || '" foi alterado para ' || v_new_status,
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

COMMENT ON FUNCTION public.notify_ticket_status_changed() IS 
  'Trigger: Notifies ticket participants when status changes. Uses tp.profile_id (Identity Hardening v2.1).';