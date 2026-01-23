-- =====================================================
-- ADD: Trigger for ticket.created notification event
-- Notifies the internal owner (if assigned on creation) about the new ticket
-- =====================================================

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
  v_recipients UUID[];
BEGIN
  -- Only on INSERT
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Get creator info
  SELECT COALESCE(p.display_name, 'Alguém'), p.user_id
  INTO v_creator_name, v_creator_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.created_by_user_id;
  
  IF v_creator_auth_id IS NULL THEN
    -- Creator might be external contact
    SELECT COALESCE(pc.name, 'Contato'), pc.user_id
    INTO v_creator_name, v_creator_auth_id
    FROM public.partner_contacts pc
    WHERE pc.id = NEW.created_by_user_id;
  END IF;
  
  -- Initialize recipients
  v_recipients := ARRAY[]::UUID[];
  
  -- If there's an internal owner assigned, notify them (unless they are the creator)
  IF NEW.owner_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_owner_auth_id
    FROM public.profiles p
    WHERE p.id = NEW.owner_user_id
      AND p.user_id IS NOT NULL;
    
    IF v_owner_auth_id IS NOT NULL AND v_owner_auth_id IS DISTINCT FROM v_creator_auth_id THEN
      v_recipients := ARRAY_APPEND(v_recipients, v_owner_auth_id);
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

-- Create trigger for INSERT on tickets
DROP TRIGGER IF EXISTS trg_notify_ticket_created ON public.tickets;
CREATE TRIGGER trg_notify_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_created();

-- Add comment
COMMENT ON FUNCTION public.notify_ticket_created() IS 
'Notifies the assigned internal owner when a new ticket is created.
Event: ticket.created
Recipients: Internal owner (if assigned and different from creator)';