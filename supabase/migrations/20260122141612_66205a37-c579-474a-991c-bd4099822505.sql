-- Fix notify_ticket_mention to support external authors (partner_contacts)
-- Problem: When an external contact mentions someone, the function fails to:
-- 1. Get the author info from partner_contacts (was only looking at profiles)
-- 2. Handle NULL author_auth_id in comparisons (NULL != UUID returns NULL, not TRUE)

CREATE OR REPLACE FUNCTION public.notify_ticket_mention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
  v_ticket_title text;
  v_author_auth_id uuid;
  v_author_name text;
  v_author_type text;
  v_recipient_auth_id uuid;
  v_context_url text;
BEGIN
  -- Only process ticket_message mentions
  IF NEW.entity_type != 'ticket_message' THEN
    RETURN NEW;
  END IF;

  -- Get ticket info from the message (including author type)
  SELECT 
    tm.ticket_id,
    t.title,
    tm.author_type,
    tm.author_user_id,
    tm.author_contact_id
  INTO 
    v_ticket_id,
    v_ticket_title,
    v_author_type,
    v_author_auth_id, -- temporarily store profile id or null
    v_author_name      -- temporarily store contact id or null (will reuse variable)
  FROM public.ticket_messages tm
  JOIN public.tickets t ON t.id = tm.ticket_id
  WHERE tm.id = NEW.entity_id;

  IF v_ticket_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Now resolve the actual author info based on author_type
  IF v_author_type = 'internal_user' AND v_author_auth_id IS NOT NULL THEN
    -- v_author_auth_id currently has profile_id, convert to auth.users.id
    SELECT p.user_id, p.display_name
    INTO v_author_auth_id, v_author_name
    FROM public.profiles p
    WHERE p.id = v_author_auth_id;
  ELSIF v_author_type = 'partner_contact' THEN
    -- Author is external contact - get their auth id and name
    -- v_author_name currently has the contact_id (from above query), use it
    DECLARE
      v_contact_id uuid := v_author_name::uuid; -- was stored temporarily
    BEGIN
      SELECT pc.user_id, pc.name
      INTO v_author_auth_id, v_author_name
      FROM public.partner_contacts pc
      WHERE pc.id = v_contact_id;
    END;
  ELSE
    -- System message or unknown type
    v_author_auth_id := NULL;
    v_author_name := 'Alguém';
  END IF;

  -- Build context URL using go link for automatic BU resolution
  v_context_url := '/go/ticket/' || v_ticket_id::text;

  -- Handle internal user mention
  IF NEW.mentioned_user_id IS NOT NULL THEN
    SELECT user_id INTO v_recipient_auth_id
    FROM public.profiles
    WHERE id = NEW.mentioned_user_id;

    -- Use IS DISTINCT FROM to handle NULL comparisons properly
    IF v_recipient_auth_id IS NOT NULL AND v_recipient_auth_id IS DISTINCT FROM v_author_auth_id THEN
      PERFORM public.emit_notification_event(
        'mention.created',
        NEW.bu_id,
        ARRAY[v_recipient_auth_id],
        v_author_auth_id,
        COALESCE(v_author_name, 'Alguém') || ' mencionou você',
        'em um ticket: ' || COALESCE(v_ticket_title, 'Sem título'),
        'ticket',
        v_ticket_id,
        v_context_url,
        jsonb_build_object('mention_id', NEW.id, 'ticket_id', v_ticket_id)
      );
    END IF;
  END IF;

  -- Handle external contact mention
  IF NEW.mentioned_contact_id IS NOT NULL THEN
    DECLARE
      v_contact_auth_id uuid;
    BEGIN
      SELECT user_id INTO v_contact_auth_id
      FROM public.partner_contacts
      WHERE id = NEW.mentioned_contact_id;

      -- Use IS DISTINCT FROM to handle NULL comparisons properly
      IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id IS DISTINCT FROM v_author_auth_id THEN
        PERFORM public.emit_notification_event(
          'mention.created',
          NEW.bu_id,
          ARRAY[v_contact_auth_id],
          v_author_auth_id,
          COALESCE(v_author_name, 'Alguém') || ' mencionou você',
          'em um ticket: ' || COALESCE(v_ticket_title, 'Sem título'),
          'ticket',
          v_ticket_id,
          v_context_url,
          jsonb_build_object('mention_id', NEW.id, 'ticket_id', v_ticket_id, 'is_external', true)
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_ticket_mention() IS 
'Trigger function to send notifications when a user is mentioned in a ticket message.
Fixed in v2.59.2: 
- Now properly resolves author info from partner_contacts when author_type is partner_contact
- Uses IS DISTINCT FROM for NULL-safe comparisons
- External contacts mentioning others now correctly triggers notifications';