-- ============================================================
-- FIX: Auto-add mention as participant trigger
-- ============================================================
-- The trigger was pointing to ticket_mentions (non-existent table)
-- Now it will work with the 'mentions' table that uses entity_type/entity_id
-- ============================================================

-- 1. Drop old trigger on mentions if exists
DROP TRIGGER IF EXISTS trg_auto_add_mention_as_participant ON public.mentions;

-- 2. Recreate the function to work with the generic mentions table
CREATE OR REPLACE FUNCTION public.auto_add_mention_as_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket_id uuid;
BEGIN
  -- Only process ticket_message mentions
  IF NEW.entity_type != 'ticket_message' THEN
    RETURN NEW;
  END IF;

  -- Get ticket_id from the message
  SELECT ticket_id INTO v_ticket_id
  FROM public.ticket_messages
  WHERE id = NEW.entity_id;

  IF v_ticket_id IS NULL THEN
    RAISE WARNING 'auto_add_mention_as_participant: message % not found', NEW.entity_id;
    RETURN NEW;
  END IF;

  -- If mentioning internal user
  IF NEW.mentioned_user_id IS NOT NULL THEN
    INSERT INTO public.ticket_participants (
      bu_id,
      ticket_id,
      participant_type,
      profile_id,
      role,
      is_active
    )
    VALUES (
      NEW.bu_id,
      v_ticket_id,
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
      v_ticket_id,
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
  'Trigger: Auto-adds mentioned users as ticket participants when entity_type=ticket_message. Resolves ticket_id from the message.';

-- 3. Create trigger on the mentions table
CREATE TRIGGER trg_auto_add_mention_as_participant
  AFTER INSERT ON public.mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_mention_as_participant();

-- 4. Drop old notify trigger on mentions if exists
DROP TRIGGER IF EXISTS trg_notify_mention ON public.mentions;

-- 5. Create or replace the notification function for mentions
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

  -- Build context URL
  v_context_url := '/go/ticket/' || v_ticket_id::text;

  -- Handle internal user mention
  IF NEW.mentioned_user_id IS NOT NULL THEN
    -- Get the auth user_id for the mentioned profile
    SELECT user_id INTO v_recipient_auth_id
    FROM public.profiles
    WHERE id = NEW.mentioned_user_id;

    IF v_recipient_auth_id IS NOT NULL AND v_recipient_auth_id != v_author_auth_id THEN
      -- Emit notification event
      PERFORM public.emit_notification_event(
        NEW.bu_id,
        'ticket_mention',
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
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_ticket_mention() IS 
  'Trigger: Sends notification when a user is mentioned in a ticket message.';

-- 6. Create the notification trigger on mentions table
CREATE TRIGGER trg_notify_mention
  AFTER INSERT ON public.mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_mention();