-- FIX: Corrige o trigger notify_ticket_message_created que referencia NEW.content (coluna inexistente)
-- A coluna correta é body_richtext (JSONB) - precisamos extrair o texto dela

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
  -- body_richtext can be: 
  --   { "content": "plain text" } 
  --   or { "type": "doc", "content": [...] } (ProseMirror format)
  --   or { "type": "system", "content": "..." }
  IF NEW.body_richtext IS NOT NULL THEN
    -- Try to get the content field first (works for simple format and system messages)
    v_body_text := NEW.body_richtext->>'content';
    
    -- If content is an array (ProseMirror doc), extract text from first paragraph
    IF v_body_text IS NULL AND jsonb_typeof(NEW.body_richtext->'content') = 'array' THEN
      -- Get text from first paragraph's first text node
      v_body_text := NEW.body_richtext->'content'->0->'content'->0->>'text';
    END IF;
  END IF;
  
  -- Create message snippet (max 200 chars)
  v_message_snippet := LEFT(COALESCE(v_body_text, ''), 200);
  IF LENGTH(COALESCE(v_body_text, '')) > 200 THEN
    v_message_snippet := v_message_snippet || '...';
  END IF;
  
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
  
  -- ENHANCED: Include title, author_name, message for v2 template
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.message.created',
    p_bu_id := v_ticket.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_author_auth_id,
    p_title := v_author_name || ' respondeu no ticket',
    p_body := v_message_snippet,
    p_reference_id := NEW.ticket_id,
    p_reference_type := 'ticket',
    p_data := jsonb_build_object(
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
Fixed in v2.51.1: Uses body_richtext (JSONB) instead of non-existent content column.';