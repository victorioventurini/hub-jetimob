-- ============================================================
-- NOTIFICATION TEMPLATES v2 - Trigger Enhancement
-- Add missing metadata variables for v2 template rendering
-- ============================================================

-- ============================================================
-- 1. UPDATE notify_ticket_message_created
-- Add: title, author_name, message (snippet)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_ticket_message_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket RECORD;
  v_author_name TEXT;
  v_author_auth_id UUID;
  v_recipients UUID[];
  v_contact_auth_id UUID;
  v_message_snippet TEXT;
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
  
  -- Create message snippet (max 200 chars)
  v_message_snippet := LEFT(COALESCE(NEW.content, ''), 200);
  IF LENGTH(COALESCE(NEW.content, '')) > 200 THEN
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
    p_message := COALESCE(v_ticket.title, 'Sem título'),
    p_context_type := 'ticket',
    p_context_id := NEW.ticket_id,
    p_context_url := '/go/ticket/' || NEW.ticket_id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'message_id', NEW.id,
      'title', COALESCE(v_ticket.title, 'Sem título'),
      'actor_name', v_author_name,
      'message', v_message_snippet
    )
  );
  
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 2. UPDATE notify_ticket_status_changed
-- Add: title, actor_name (already has new_status)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket_title TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_recipients UUID[];
  v_actor_name TEXT;
  v_actor_auth_id UUID;
  v_contact_auth_id UUID;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  v_ticket_title := NEW.title;
  v_old_status := OLD.status::TEXT;
  v_new_status := NEW.status::TEXT;
  
  -- Get actor info
  SELECT p.display_name, p.user_id 
  INTO v_actor_name, v_actor_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.owner_user_id;
  
  v_actor_name := COALESCE(v_actor_name, 'Alguém');
  
  -- Get all internal participants' auth_user_ids
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
  WHERE tp.ticket_id = NEW.id
    AND tp.is_active = TRUE
    AND tp.participant_type = 'internal_user'
    AND p.user_id IS NOT NULL
    AND (v_actor_auth_id IS NULL OR p.user_id != v_actor_auth_id);
  
  -- Include assigned external contact if exists (and is not the actor)
  IF NEW.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id 
    INTO v_contact_auth_id
    FROM public.partner_contacts pc 
    WHERE pc.id = NEW.assigned_contact_id
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;
    
    IF v_contact_auth_id IS NOT NULL AND (v_actor_auth_id IS NULL OR v_contact_auth_id != v_actor_auth_id) THEN
      v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
    END IF;
  END IF;
  
  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- ENHANCED: Include title, actor_name for v2 template
  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.status.changed',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_actor_auth_id,
    p_title := 'Status do ticket alterado',
    p_message := 'Ticket "' || COALESCE(v_ticket_title, 'Sem título') || '" foi alterado para ' || v_new_status,
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'title', COALESCE(v_ticket_title, 'Sem título'),
      'old_status', v_old_status,
      'new_status', v_new_status,
      'actor_name', v_actor_name
    )
  );
  
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 3. UPDATE notify_asset_checkout
-- Add: checkout_date, due_at, authorized_by, asset_category
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_asset_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_asset_name TEXT;
  v_asset_code TEXT;
  v_asset_category TEXT;
  v_recipient_user_id UUID;
  v_authorized_by_name TEXT;
  v_checkout_date TEXT;
  v_due_at TEXT;
BEGIN
  -- Only on checkout movements (when asset assigned to user)
  IF NEW.movement_type != 'checkout' OR NEW.to_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get asset info with category
  SELECT 
    ai.name, 
    ai.internal_code,
    COALESCE(ac.name, 'Sem categoria')
  INTO v_asset_name, v_asset_code, v_asset_category
  FROM public.asset_inventory ai
  LEFT JOIN public.asset_categories ac ON ac.id = ai.category_id
  WHERE ai.id = NEW.asset_id;
  
  -- Get recipient auth user_id from profile
  SELECT user_id INTO v_recipient_user_id
  FROM public.profiles
  WHERE id = NEW.to_user_id;
  
  IF v_recipient_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get authorized_by name
  IF NEW.authorized_by_user_id IS NOT NULL THEN
    SELECT COALESCE(display_name, 'Alguém') INTO v_authorized_by_name
    FROM public.profiles
    WHERE id = NEW.authorized_by_user_id;
  ELSE
    v_authorized_by_name := NULL;
  END IF;
  
  -- Format dates
  v_checkout_date := TO_CHAR(NEW.occurred_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY');
  IF NEW.due_at IS NOT NULL THEN
    v_due_at := TO_CHAR(NEW.due_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY');
  ELSE
    v_due_at := 'Não definida';
  END IF;
  
  -- ENHANCED: Include all v2 template variables
  PERFORM public.emit_notification_event(
    p_event_slug := 'asset.checkout',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := ARRAY[v_recipient_user_id],
    p_actor_id := NEW.performed_by_user_id,
    p_title := 'Um ativo foi emprestado para você',
    p_message := COALESCE(v_asset_code, '') || ' - ' || COALESCE(v_asset_name, 'Ativo'),
    p_context_type := 'asset_movement',
    p_context_id := NEW.id::TEXT,
    p_context_url := '/go/asset/' || NEW.asset_id,
    p_metadata := jsonb_build_object(
      'asset_id', NEW.asset_id,
      'asset_name', v_asset_name,
      'asset_code', v_asset_code,
      'asset_category', v_asset_category,
      'movement_id', NEW.id,
      'movement_type', NEW.movement_type,
      'checkout_date', v_checkout_date,
      'due_at', v_due_at,
      'authorized_by', v_authorized_by_name
    )
  );
  
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 4. UPDATE notify_team_membership_changed
-- Already has team_name, just ensure actor_name is passed
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_team_membership_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_member_name TEXT;
  v_member_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_event_slug TEXT;
  v_bu_id UUID;
  v_actor_name TEXT;
BEGIN
  -- Get team ID from either NEW or OLD (depending on operation)
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);
  
  -- Get team info
  SELECT name, bu_id INTO v_team_name, v_bu_id
  FROM public.teams
  WHERE id = v_team_id;
  
  IF v_team_name IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get member info - use profile_id (NOT user_id) 
  SELECT p.display_name, p.user_id 
  INTO v_member_name, v_member_user_id
  FROM public.profiles p
  WHERE p.id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Skip if no auth user_id for notification recipient
  IF v_member_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get actor name (who made the change) - use session user if available
  -- For now, we'll use a generic value as triggers don't have session context
  v_actor_name := 'Um administrador';
  
  -- Determine event type
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
    v_event_slug := 'team.member.added';
    v_title := 'Você foi adicionado a um time';
    v_message := 'Você agora faz parte do time ' || v_team_name;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    v_event_slug := 'team.member.removed';
    v_title := 'Você foi removido de um time';
    v_message := 'Você não faz mais parte do time ' || v_team_name;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- ENHANCED: Include actor_name for v2 template
  PERFORM public.emit_notification_event(
    p_event_slug := v_event_slug,
    p_bu_id := v_bu_id,
    p_recipient_user_ids := ARRAY[v_member_user_id],
    p_actor_id := NULL,
    p_title := v_title,
    p_message := v_message,
    p_context_type := 'team',
    p_context_id := v_team_id::TEXT,
    p_context_url := '/go/team/' || v_team_id,
    p_metadata := jsonb_build_object(
      'team_id', v_team_id,
      'team_name', v_team_name,
      'member_name', v_member_name,
      'actor_name', v_actor_name
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Notification triggers enhanced with v2 metadata variables';
END $$;