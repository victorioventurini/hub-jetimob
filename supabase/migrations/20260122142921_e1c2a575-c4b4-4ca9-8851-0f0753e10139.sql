-- Fix notify_ticket_message_created to ALWAYS include ticket owner in recipients
-- Problem: Owner (owner_user_id) was not being explicitly included if not in participants table
-- TCR v2.59.0 requires: "Proprietário e responsável sempre recebem notificações"

CREATE OR REPLACE FUNCTION public.notify_ticket_message_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Extract text from body_richtext JSONB (supports simple and ProseMirror formats)
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
  
  -- Build context URL for deep linking (go link pattern)
  v_context_url := '/go/ticket/' || NEW.ticket_id::TEXT;
  
  -- Initialize recipients array
  v_recipients := ARRAY[]::UUID[];
  
  -- 1. Get ticket OWNER's auth_user_id (ALWAYS notified unless they are the author)
  IF v_ticket.owner_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_owner_auth_id
    FROM public.profiles p
    WHERE p.id = v_ticket.owner_user_id
      AND p.user_id IS NOT NULL;
    
    IF v_owner_auth_id IS NOT NULL AND v_owner_auth_id IS DISTINCT FROM v_author_auth_id THEN
      v_recipients := ARRAY_APPEND(v_recipients, v_owner_auth_id);
    END IF;
  END IF;
  
  -- 2. Get all internal participants' auth_user_ids (excluding author and already-added owner)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM (
    -- Start with existing recipients (owner)
    SELECT UNNEST(v_recipients) as user_id
    UNION
    -- Add all internal participants
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
  
  -- 3. Include assigned external contact (responsible) if exists and is not the author
  IF v_ticket.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id 
    INTO v_contact_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = v_ticket.assigned_contact_id
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;
    
    IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id IS DISTINCT FROM v_author_auth_id THEN
      -- Add if not already in list
      IF NOT (v_contact_auth_id = ANY(COALESCE(v_recipients, ARRAY[]::UUID[]))) THEN
        v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
      END IF;
    END IF;
  END IF;
  
  -- Exit if no recipients
  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification event with correct parameter names (TCR v2.59.0)
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

COMMENT ON FUNCTION public.notify_ticket_message_created() IS 
'Trigger function to notify ticket participants when a new message is created.
v2.59.3: Fixed to ALWAYS include ticket owner (owner_user_id) in recipients.
- Owner and assigned contact (responsible) always receive notifications
- All active internal participants receive notifications
- Author is excluded from recipients
- Uses IS DISTINCT FROM for NULL-safe comparisons
- Skips system messages';