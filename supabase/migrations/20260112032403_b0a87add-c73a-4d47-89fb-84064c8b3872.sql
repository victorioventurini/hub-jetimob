-- =============================================================================
-- Fix: Ticket Mention System - Auto-add participants and create notifications
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create function to auto-add mentioned users as ticket participants
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_add_ticket_mention_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      bu_id, ticket_id, participant_type, user_id, role, is_active
    )
    VALUES (
      v_bu_id, v_ticket_id, 'internal_user', 
      NEW.mentioned_user_id, 'watcher', true
    )
    ON CONFLICT (ticket_id, user_id) WHERE user_id IS NOT NULL 
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

-- Create trigger for auto-adding participants
DROP TRIGGER IF EXISTS trg_auto_add_ticket_mention_as_participant ON public.mentions;
CREATE TRIGGER trg_auto_add_ticket_mention_as_participant
AFTER INSERT ON public.mentions
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_ticket_mention_as_participant();

-- -----------------------------------------------------------------------------
-- 2. Create function to notify mentioned internal users
-- -----------------------------------------------------------------------------
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
BEGIN
  -- Only process ticket message mentions for internal users
  IF NEW.entity_type != 'ticket_message' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if no internal user mentioned
  IF NEW.mentioned_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Don't notify self-mentions
  IF NEW.mentioned_user_id = NEW.created_by THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket info
  SELECT tm.ticket_id, t.title, t.bu_id INTO v_ticket_id, v_ticket_title, v_bu_id
  FROM public.ticket_messages tm
  JOIN public.tickets t ON t.id = tm.ticket_id
  WHERE tm.id = NEW.entity_id;
  
  IF v_ticket_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get author name
  SELECT COALESCE(display_name, email) INTO v_author_name
  FROM public.profiles
  WHERE id = NEW.created_by;
  
  v_context_url := '/tickets/' || v_ticket_id::text;
  
  -- Create notification
  INSERT INTO public.notifications (
    user_id, bu_id, type, title, message,
    context_type, context_id, context_url, actor_id
  )
  VALUES (
    NEW.mentioned_user_id,
    v_bu_id,
    'mention',
    COALESCE(v_author_name, 'Alguém') || ' mencionou você',
    'em um ticket: ' || COALESCE(v_ticket_title, 'Sem título'),
    'ticket',
    v_ticket_id,
    v_context_url,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for notifications
DROP TRIGGER IF EXISTS trg_notify_ticket_mention ON public.mentions;
CREATE TRIGGER trg_notify_ticket_mention
AFTER INSERT ON public.mentions
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_mention();

-- -----------------------------------------------------------------------------
-- 3. Add comments documenting the triggers
-- -----------------------------------------------------------------------------
COMMENT ON FUNCTION public.auto_add_ticket_mention_as_participant() IS 
'Automatically adds mentioned users/contacts as ticket participants with watcher role when mentioned in ticket messages';

COMMENT ON FUNCTION public.notify_ticket_mention() IS 
'Creates in-app notifications for internal users when they are mentioned in ticket messages';