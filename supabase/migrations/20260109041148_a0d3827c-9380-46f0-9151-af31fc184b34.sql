-- =============================================================
-- NOTIFICATION ID CONVENTION FIX
-- ProfileId vs AuthUserId - Canonical Resolution
-- =============================================================

-- 1) CREATE V2 RPC: accepts profile_id, resolves auth_user_id internally
CREATE OR REPLACE FUNCTION public.send_test_notification_v2(
  p_bu_id UUID,
  p_target_profile_id UUID,
  p_channels TEXT[] DEFAULT ARRAY['in_app', 'email']
)
RETURNS TABLE (
  notification_id UUID,
  outbox_id UUID,
  channel TEXT,
  status TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_channel TEXT;
  v_notification_id UUID;
  v_outbox_id UUID;
  v_actor_id UUID;
  v_auth_user_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  v_actor_id := auth.uid();
  
  -- STEP 1: Validate profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_target_profile_id AND bu_id = p_bu_id)
  INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    notification_id := NULL;
    outbox_id := NULL;
    channel := 'all';
    status := 'error';
    error_message := 'PROFILE_NOT_FOUND: Profile does not exist in this BU';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- STEP 2: Resolve auth_user_id from profile
  SELECT p.user_id INTO v_auth_user_id
  FROM profiles p
  WHERE p.id = p_target_profile_id;
  
  -- STEP 3: Process each channel
  FOREACH v_channel IN ARRAY p_channels
  LOOP
    -- For in_app and email, we need auth_user_id
    IF v_channel IN ('in_app', 'email', 'slack', 'webhook') THEN
      IF v_auth_user_id IS NULL THEN
        notification_id := NULL;
        outbox_id := NULL;
        channel := v_channel;
        status := 'error';
        error_message := 'PROFILE_HAS_NO_AUTH_USER: User has not logged in yet. Cannot send notification.';
        RETURN NEXT;
        CONTINUE;
      END IF;
    END IF;
    
    IF v_channel = 'in_app' THEN
      -- Create in-app notification using auth_user_id
      INSERT INTO public.notifications (
        user_id, bu_id, type, title, message,
        event_slug, actor_id, metadata
      ) VALUES (
        v_auth_user_id, p_bu_id, 'info'::notification_type,
        'Notificação de Teste',
        'Esta é uma notificação de teste para verificar o sistema.',
        'notifications.test', v_actor_id,
        jsonb_build_object('test', true, 'sent_at', now(), 'target_profile_id', p_target_profile_id)
      )
      RETURNING id INTO v_notification_id;
      
      notification_id := v_notification_id;
      outbox_id := NULL;
      channel := 'in_app';
      status := 'sent';
      error_message := NULL;
      RETURN NEXT;
      
    ELSIF v_channel = 'email' THEN
      -- Queue for email delivery using auth_user_id
      INSERT INTO public.notification_outbox (
        bu_id, user_id, event_slug, channel_slug, payload, status
      ) VALUES (
        p_bu_id, v_auth_user_id, 'notifications.test', 'email',
        jsonb_build_object(
          'title', 'Notificação de Teste',
          'message', 'Esta é uma notificação de teste para verificar o sistema de e-mail.',
          'actor_id', v_actor_id,
          'test', true,
          'sent_at', now(),
          'target_profile_id', p_target_profile_id
        ),
        'pending'
      )
      RETURNING id INTO v_outbox_id;
      
      notification_id := NULL;
      outbox_id := v_outbox_id;
      channel := 'email';
      status := 'queued';
      error_message := NULL;
      RETURN NEXT;
      
    ELSIF v_channel = 'slack' THEN
      INSERT INTO public.notification_outbox (
        bu_id, user_id, event_slug, channel_slug, payload, status
      ) VALUES (
        p_bu_id, v_auth_user_id, 'notifications.test', 'slack',
        jsonb_build_object(
          'title', 'Notificação de Teste',
          'message', 'Esta é uma notificação de teste para verificar o Slack.',
          'actor_id', v_actor_id,
          'test', true,
          'sent_at', now()
        ),
        'pending'
      )
      RETURNING id INTO v_outbox_id;
      
      notification_id := NULL;
      outbox_id := v_outbox_id;
      channel := 'slack';
      status := 'queued';
      error_message := NULL;
      RETURN NEXT;
      
    ELSIF v_channel = 'webhook' THEN
      INSERT INTO public.notification_outbox (
        bu_id, user_id, event_slug, channel_slug, payload, status
      ) VALUES (
        p_bu_id, v_auth_user_id, 'notifications.test', 'webhook',
        jsonb_build_object(
          'title', 'Notificação de Teste',
          'message', 'Esta é uma notificação de teste para verificar o Webhook.',
          'actor_id', v_actor_id,
          'test', true,
          'sent_at', now()
        ),
        'pending'
      )
      RETURNING id INTO v_outbox_id;
      
      notification_id := NULL;
      outbox_id := v_outbox_id;
      channel := 'webhook';
      status := 'queued';
      error_message := NULL;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$function$;

-- 2) Mark old RPC as deprecated (comment only, keep for compatibility)
COMMENT ON FUNCTION public.send_test_notification(uuid, uuid, text[]) IS 
'@deprecated Use send_test_notification_v2 instead. This function expects auth.users.id as p_target_user_id, which is error-prone. The v2 function accepts profiles.id and resolves auth_user_id internally.';

-- 3) Document the new function
COMMENT ON FUNCTION public.send_test_notification_v2(uuid, uuid, text[]) IS 
'Send test notification to a profile. Accepts profile_id (profiles.id) and resolves auth_user_id internally. Returns error if profile has no auth user (never logged in).';