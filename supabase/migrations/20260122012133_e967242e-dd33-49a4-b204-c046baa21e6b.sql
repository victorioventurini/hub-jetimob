-- ============================================================
-- FIX: Use correct event slug 'mention.created' instead of 'ticket_mention'
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_ticket_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket_id uuid;
  v_ticket_title text;
  v_author_auth_id uuid;
  v_author_name text;
  v_recipient_auth_id uuid;
  v_context_url text;
BEGIN
  -- Only process ticket_message mentions
  IF NEW.entity_type != 'ticket_message' THEN
    RETURN NEW;
  END IF;

  -- Get ticket info from the message
  SELECT 
    tm.ticket_id,
    t.title,
    p.user_id,
    p.display_name
  INTO 
    v_ticket_id,
    v_ticket_title,
    v_author_auth_id,
    v_author_name
  FROM public.ticket_messages tm
  JOIN public.tickets t ON t.id = tm.ticket_id
  LEFT JOIN public.profiles p ON p.id = tm.author_user_id
  WHERE tm.id = NEW.entity_id;

  IF v_ticket_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build context URL using go link for automatic BU resolution
  v_context_url := '/go/ticket/' || v_ticket_id::text;

  -- Handle internal user mention
  IF NEW.mentioned_user_id IS NOT NULL THEN
    SELECT user_id INTO v_recipient_auth_id
    FROM public.profiles
    WHERE id = NEW.mentioned_user_id;

    IF v_recipient_auth_id IS NOT NULL AND v_recipient_auth_id != v_author_auth_id THEN
      -- Use correct event slug: mention.created
      PERFORM public.emit_notification_event(
        'mention.created',                                          -- p_event_slug (correct!)
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

      IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id != v_author_auth_id THEN
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
  'Trigger: Emits mention.created notification when user is mentioned in ticket message.';