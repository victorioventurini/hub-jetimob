-- ============================================================
-- FIX: Correct emit_notification_event call signature in notify_ticket_mention
-- ============================================================
-- The function signature is: (p_event_slug, p_bu_id, ...) 
-- but was being called as: (bu_id, event_slug, ...)
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
    -- Get the auth user_id for the mentioned profile
    SELECT user_id INTO v_recipient_auth_id
    FROM public.profiles
    WHERE id = NEW.mentioned_user_id;

    IF v_recipient_auth_id IS NOT NULL AND v_recipient_auth_id != v_author_auth_id THEN
      -- Emit notification event with CORRECT argument order:
      -- (p_event_slug, p_bu_id, p_recipient_user_ids, p_actor_id, p_title, p_message, p_context_type, p_context_id, p_context_url, p_metadata)
      PERFORM public.emit_notification_event(
        'ticket_mention',                                           -- p_event_slug
        NEW.bu_id,                                                  -- p_bu_id
        ARRAY[v_recipient_auth_id],                                 -- p_recipient_user_ids
        v_author_auth_id,                                           -- p_actor_id
        COALESCE(v_author_name, 'Alguém') || ' mencionou você',    -- p_title
        'em um ticket: ' || COALESCE(v_ticket_title, 'Sem título'), -- p_message
        'ticket',                                                   -- p_context_type
        v_ticket_id,                                                -- p_context_id
        v_context_url,                                              -- p_context_url
        jsonb_build_object('mention_id', NEW.id, 'ticket_id', v_ticket_id) -- p_metadata
      );
    END IF;
  END IF;

  -- Handle external contact mention (email only via outbox)
  IF NEW.mentioned_contact_id IS NOT NULL THEN
    -- External contacts get notified via partner notification system
    -- The emit_notification_event handles external audience routing
    DECLARE
      v_contact_auth_id uuid;
    BEGIN
      SELECT user_id INTO v_contact_auth_id
      FROM public.partner_contacts
      WHERE id = NEW.mentioned_contact_id;

      IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id != v_author_auth_id THEN
        PERFORM public.emit_notification_event(
          'ticket_mention',
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
  'Trigger: Emits notification when user is mentioned in ticket message. Uses emit_notification_event with correct signature.';