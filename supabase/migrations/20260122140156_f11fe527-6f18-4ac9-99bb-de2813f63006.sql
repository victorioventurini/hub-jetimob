-- Fix notify_ticket_message_created function to use correct emit_notification_event signature
-- The current version uses wrong parameter names: p_body, p_reference_id, p_reference_type, p_data
-- Correct signature is: p_message, p_context_type, p_context_id, p_context_url, p_metadata

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
  v_message_snippet TEXT;
  v_body_text TEXT;
  v_context_url TEXT;
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
  
  -- Get all internal participants' auth_user_ids
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
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
  
  -- Call emit_notification_event with CORRECT parameter names
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.message.created',
    p_bu_id := v_ticket.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_author_auth_id,
    p_title := v_author_name || ' respondeu no ticket',
    p_message := v_message_snippet,  -- FIXED: was p_body
    p_context_type := 'ticket',       -- FIXED: was p_reference_type
    p_context_id := NEW.ticket_id,    -- FIXED: was p_reference_id
    p_context_url := v_context_url,   -- ADDED
    p_metadata := jsonb_build_object( -- FIXED: was p_data
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
'Trigger function to send notifications when a ticket message is created. 
Fixed in v2.59.1: Corrected emit_notification_event parameter names (p_message instead of p_body, p_context_* instead of p_reference_*, p_metadata instead of p_data).';