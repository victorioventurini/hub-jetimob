-- Migração: Padronizar context_url em TODAS as notificações para padrão /go/{entity}/{id}
-- Isso garante resolução automática de BU para usuários multi-tenant

-- ========================================
-- 1. notify_team_membership_changed
-- De: '/teams/{id}' Para: '/go/team/{id}'
-- ========================================
CREATE OR REPLACE FUNCTION public.notify_team_membership_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_member_name TEXT;
  v_member_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_event_slug TEXT;
  v_bu_id UUID;
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
  
  -- Emit notification with corrected context_url
  PERFORM public.emit_notification_event(
    p_event_slug := v_event_slug,
    p_bu_id := v_bu_id,
    p_recipient_user_ids := ARRAY[v_member_user_id],
    p_actor_id := NULL,
    p_title := v_title,
    p_message := v_message,
    p_context_type := 'team',
    p_context_id := v_team_id::TEXT,
    p_context_url := '/go/team/' || v_team_id,  -- FIXED: was '/teams/'
    p_metadata := jsonb_build_object(
      'team_id', v_team_id,
      'team_name', v_team_name,
      'member_name', v_member_name
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ========================================
-- 2. notify_asset_checkout
-- De: '/assets/inventory/{id}' Para: '/go/asset/{id}'
-- ========================================
CREATE OR REPLACE FUNCTION public.notify_asset_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_asset_name TEXT;
  v_asset_code TEXT;
  v_recipient_user_id UUID;
BEGIN
  -- Only on checkout movements (when asset assigned to user)
  IF NEW.movement_type != 'checkout' OR NEW.to_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get asset info
  SELECT name, internal_code INTO v_asset_name, v_asset_code
  FROM public.asset_inventory
  WHERE id = NEW.asset_id;
  
  -- Get recipient auth user_id from profile
  SELECT user_id INTO v_recipient_user_id
  FROM public.profiles
  WHERE id = NEW.to_user_id;
  
  IF v_recipient_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Emit notification with corrected context_url
  PERFORM public.emit_notification_event(
    p_event_slug := 'asset.checkout',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := ARRAY[v_recipient_user_id],
    p_actor_id := NEW.performed_by_user_id,
    p_title := 'Um ativo foi emprestado para você',
    p_message := COALESCE(v_asset_code, '') || ' - ' || COALESCE(v_asset_name, 'Ativo'),
    p_context_type := 'asset_movement',
    p_context_id := NEW.id::TEXT,
    p_context_url := '/go/asset/' || NEW.asset_id,  -- FIXED: was '/assets/inventory/'
    p_metadata := jsonb_build_object(
      'asset_id', NEW.asset_id,
      'asset_name', v_asset_name,
      'asset_code', v_asset_code,
      'movement_id', NEW.id,
      'movement_type', NEW.movement_type
    )
  );
  
  RETURN NEW;
END;
$$;


-- Add comments documenting the multi-BU support
COMMENT ON FUNCTION public.notify_team_membership_changed IS 'Notifies users when added/removed from teams. Uses /go/team/ for multi-BU context resolution.';
COMMENT ON FUNCTION public.notify_asset_checkout IS 'Notifies users when an asset is checked out to them. Uses /go/asset/ for multi-BU context resolution.';