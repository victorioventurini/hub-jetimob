-- =============================================================
-- Notification Triggers for Events (Fixed)
-- Adds triggers to emit notification events for:
-- 1. Tickets: assigned, status changed, message created
-- 2. Teams: member added, member removed (via user_team_memberships)
-- 3. Assets: checkout
-- =============================================================

-- =============================================================
-- 1. TICKET ASSIGNED TRIGGER
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ticket_code TEXT;
  v_ticket_subject TEXT;
  v_actor_name TEXT;
  v_auth_user_id UUID;
BEGIN
  -- Only trigger on assignee change
  IF OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN
    RETURN NEW;
  END IF;
  
  -- Only notify if new assignee exists
  IF NEW.assignee_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket info
  SELECT code, subject INTO v_ticket_code, v_ticket_subject
  FROM public.tickets
  WHERE id = NEW.id;
  
  -- Get actor name (who assigned)
  SELECT display_name INTO v_actor_name
  FROM public.profiles
  WHERE id = NEW.updated_by;
  
  -- Get auth_user_id for recipient
  SELECT user_id INTO v_auth_user_id
  FROM public.profiles
  WHERE id = NEW.assignee_id;
  
  IF v_auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.assigned',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := ARRAY[v_auth_user_id],
    p_actor_id := NEW.updated_by,
    p_title := COALESCE(v_actor_name, 'Alguém') || ' atribuiu um ticket a você',
    p_message := v_ticket_code || ': ' || COALESCE(v_ticket_subject, 'Sem assunto'),
    p_context_type := 'ticket',
    p_context_id := NEW.id::TEXT,
    p_context_url := '/tickets/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'ticket_code', v_ticket_code,
      'assignee_name', (SELECT display_name FROM profiles WHERE id = NEW.assignee_id)
    )
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ticket_assigned ON public.tickets;
CREATE TRIGGER trg_notify_ticket_assigned
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_assigned();

-- =============================================================
-- 2. TICKET STATUS CHANGED TRIGGER  
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ticket_code TEXT;
  v_ticket_subject TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_recipients UUID[];
  v_actor_name TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket info
  v_ticket_code := NEW.code;
  v_ticket_subject := NEW.subject;
  v_old_status := OLD.status;
  v_new_status := NEW.status;
  
  -- Get actor name
  SELECT display_name INTO v_actor_name
  FROM public.profiles
  WHERE id = NEW.updated_by;
  
  -- Get all participants' auth_user_ids (excluding the actor)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
  WHERE tp.ticket_id = NEW.id
    AND tp.is_active = TRUE
    AND p.user_id IS NOT NULL
    AND (NEW.updated_by IS NULL OR p.id != NEW.updated_by);
  
  -- Also include external contact if exists
  IF NEW.contact_id IS NOT NULL THEN
    SELECT ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), p.user_id)
    INTO v_recipients
    FROM public.partner_contacts pc
    JOIN public.profiles p ON p.id = pc.profile_user_id
    WHERE pc.id = NEW.contact_id
      AND p.user_id IS NOT NULL;
  END IF;
  
  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.status.changed',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := NEW.updated_by,
    p_title := 'Status do ticket alterado para ' || v_new_status,
    p_message := v_ticket_code || ': ' || COALESCE(v_ticket_subject, 'Sem assunto'),
    p_context_type := 'ticket',
    p_context_id := NEW.id::TEXT,
    p_context_url := '/tickets/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'ticket_code', v_ticket_code,
      'old_status', v_old_status,
      'new_status', v_new_status
    )
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ticket_status_changed ON public.tickets;
CREATE TRIGGER trg_notify_ticket_status_changed
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_status_changed();

-- =============================================================
-- 3. TICKET MESSAGE CREATED TRIGGER
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_ticket_message_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ticket RECORD;
  v_author_name TEXT;
  v_recipients UUID[];
BEGIN
  -- Get ticket info
  SELECT t.id, t.bu_id, t.code, t.subject, t.contact_id
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = NEW.ticket_id;
  
  IF v_ticket.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get author name
  SELECT COALESCE(p.display_name, 'Alguém') INTO v_author_name
  FROM public.profiles p
  WHERE p.id = NEW.author_id;
  
  -- Get all participants' auth_user_ids (excluding the author)
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
  WHERE tp.ticket_id = NEW.ticket_id
    AND tp.is_active = TRUE
    AND p.user_id IS NOT NULL
    AND p.id != NEW.author_id;
  
  -- Also include external contact if exists (and is not the author)
  IF v_ticket.contact_id IS NOT NULL THEN
    SELECT ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), p.user_id)
    INTO v_recipients
    FROM public.partner_contacts pc
    JOIN public.profiles p ON p.id = pc.profile_user_id
    WHERE pc.id = v_ticket.contact_id
      AND p.user_id IS NOT NULL
      AND p.id != NEW.author_id;
  END IF;
  
  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.message.created',
    p_bu_id := v_ticket.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := NEW.author_id,
    p_title := v_author_name || ' enviou uma mensagem',
    p_message := v_ticket.code || ': ' || COALESCE(v_ticket.subject, 'Sem assunto'),
    p_context_type := 'ticket_message',
    p_context_id := NEW.id::TEXT,
    p_context_url := '/tickets/' || NEW.ticket_id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'ticket_code', v_ticket.code,
      'message_id', NEW.id,
      'author_name', v_author_name
    )
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ticket_message_created ON public.ticket_messages;
CREATE TRIGGER trg_notify_ticket_message_created
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_message_created();

-- =============================================================
-- 4. TEAM MEMBER ADDED/REMOVED TRIGGERS (via user_team_memberships)
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_team_membership_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_team_name TEXT;
  v_member_name TEXT;
  v_auth_user_id UUID;
  v_bu_id UUID;
  v_event_slug TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_slug := 'team.member.added';
  ELSIF TG_OP = 'DELETE' THEN
    v_event_slug := 'team.member.removed';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get team name and bu_id
  SELECT name, bu_id INTO v_team_name, v_bu_id
  FROM public.teams
  WHERE id = COALESCE(NEW.team_id, OLD.team_id);
  
  -- Get member info
  SELECT display_name, user_id INTO v_member_name, v_auth_user_id
  FROM public.profiles
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  IF v_auth_user_id IS NULL OR v_bu_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Build notification
  IF v_event_slug = 'team.member.added' THEN
    v_title := 'Você foi adicionado ao time ' || COALESCE(v_team_name, '');
    v_message := 'Bem-vindo ao time!';
  ELSE
    v_title := 'Você foi removido do time ' || COALESCE(v_team_name, '');
    v_message := 'Você não faz mais parte deste time.';
  END IF;
  
  -- Emit notification
  PERFORM public.emit_notification_event(
    p_event_slug := v_event_slug,
    p_bu_id := v_bu_id,
    p_recipient_user_ids := ARRAY[v_auth_user_id],
    p_actor_id := NULL,
    p_title := v_title,
    p_message := v_message,
    p_context_type := 'team',
    p_context_id := COALESCE(NEW.team_id, OLD.team_id)::TEXT,
    p_context_url := '/teams/' || COALESCE(NEW.team_id, OLD.team_id),
    p_metadata := jsonb_build_object(
      'team_id', COALESCE(NEW.team_id, OLD.team_id),
      'team_name', v_team_name,
      'member_name', v_member_name
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_team_member_added ON public.user_team_memberships;
CREATE TRIGGER trg_notify_team_member_added
  AFTER INSERT ON public.user_team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_membership_changed();

DROP TRIGGER IF EXISTS trg_notify_team_member_removed ON public.user_team_memberships;
CREATE TRIGGER trg_notify_team_member_removed
  AFTER DELETE ON public.user_team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_membership_changed();

-- =============================================================
-- 5. ASSET CHECKOUT TRIGGER
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_asset_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_asset_name TEXT;
  v_asset_code TEXT;
  v_performer_name TEXT;
  v_recipient_auth_id UUID;
BEGIN
  -- Only on movements where asset is being assigned to a user
  IF NEW.movement_type NOT IN ('checkout', 'assign', 'transfer') THEN
    RETURN NEW;
  END IF;
  
  IF NEW.to_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get asset info
  SELECT name, internal_code INTO v_asset_name, v_asset_code
  FROM public.asset_inventory
  WHERE id = NEW.asset_id;
  
  -- Get performer name
  SELECT display_name INTO v_performer_name
  FROM public.profiles
  WHERE id = NEW.performed_by_user_id;
  
  -- Get recipient auth_user_id
  SELECT user_id INTO v_recipient_auth_id
  FROM public.profiles
  WHERE id = NEW.to_user_id;
  
  IF v_recipient_auth_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification
  PERFORM public.emit_notification_event(
    p_event_slug := 'asset.checkout',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := ARRAY[v_recipient_auth_id],
    p_actor_id := NEW.performed_by_user_id,
    p_title := 'Um ativo foi emprestado para você',
    p_message := COALESCE(v_asset_code, '') || ' - ' || COALESCE(v_asset_name, 'Ativo'),
    p_context_type := 'asset_movement',
    p_context_id := NEW.id::TEXT,
    p_context_url := '/assets/inventory/' || NEW.asset_id,
    p_metadata := jsonb_build_object(
      'asset_id', NEW.asset_id,
      'asset_name', v_asset_name,
      'asset_code', v_asset_code,
      'movement_id', NEW.id,
      'due_at', NEW.due_at
    )
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_asset_checkout ON public.asset_movements;
CREATE TRIGGER trg_notify_asset_checkout
  AFTER INSERT ON public.asset_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_asset_checkout();