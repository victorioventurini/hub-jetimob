-- Fix: emit_notification_event uses wrong column for external user detection
-- Bug: Uses pc.profile_user_id (always NULL) instead of pc.user_id
-- This caused emails to not be sent to internal users (Victório, Mariana)

CREATE OR REPLACE FUNCTION public.emit_notification_event(
  p_event_slug TEXT,
  p_bu_id UUID,
  p_recipient_user_ids UUID[],
  p_actor_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_context_type TEXT DEFAULT NULL,
  p_context_id UUID DEFAULT NULL,
  p_context_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event public.notification_events%ROWTYPE;
  v_recipient_id UUID;
  v_channel TEXT;
  v_pref_enabled BOOLEAN;
  v_notification_id UUID;
  v_outbox_id UUID;
  v_is_external BOOLEAN;
  v_channel_enabled BOOLEAN;
  v_dedupe_key TEXT;
BEGIN
  -- Get event definition
  SELECT * INTO v_event
  FROM public.notification_events
  WHERE slug = p_event_slug;
  
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Unknown notification event: %', p_event_slug;
  END IF;
  
  -- Process each recipient
  FOREACH v_recipient_id IN ARRAY p_recipient_user_ids
  LOOP
    -- Skip if actor is recipient (don't notify yourself)
    IF v_recipient_id = p_actor_id THEN
      CONTINUE;
    END IF;
    
    -- FIX: Check if user is external (partner contact) using correct column user_id
    -- Previously used profile_user_id which is always NULL
    v_is_external := EXISTS (
      SELECT 1 FROM public.partner_contacts pc
      WHERE pc.user_id = v_recipient_id
        AND pc.status = 'active'
        AND pc.deleted_at IS NULL
    );
    
    -- Skip if audience doesn't match
    IF v_is_external AND v_event.audience = 'internal' THEN
      CONTINUE;
    END IF;
    
    IF NOT v_is_external AND v_event.audience = 'external' THEN
      CONTINUE;
    END IF;
    
    -- Process each default channel
    FOREACH v_channel IN ARRAY v_event.default_channels
    LOOP
      -- Check if channel is enabled for BU (for non-in_app channels)
      IF v_channel != 'in_app' THEN
        SELECT is_enabled INTO v_channel_enabled
        FROM public.bu_notification_channels
        WHERE bu_id = p_bu_id AND channel_slug = v_channel;
        
        IF v_channel_enabled IS FALSE THEN
          CONTINUE;
        END IF;
      END IF;
      
      -- Check user preference (unless mandatory)
      IF NOT v_event.is_mandatory THEN
        SELECT enabled INTO v_pref_enabled
        FROM public.user_notification_preferences_v2
        WHERE user_id = v_recipient_id
          AND bu_id = p_bu_id
          AND event_slug = p_event_slug
          AND channel_slug = v_channel;
        
        -- If preference exists and is disabled, skip
        IF v_pref_enabled IS FALSE THEN
          CONTINUE;
        END IF;
      END IF;
      
      -- Generate dedupe_key for idempotency
      v_dedupe_key := p_event_slug || ':' || v_recipient_id::TEXT || ':' || v_channel || ':' || COALESCE(p_context_type, 'null') || ':' || COALESCE(p_context_id::TEXT, 'null');
      
      -- Create in-app notification
      IF v_channel = 'in_app' THEN
        -- Check for duplicate in_app (within last 5 minutes)
        IF EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = v_recipient_id
            AND n.bu_id = p_bu_id
            AND n.event_slug = p_event_slug
            AND n.context_type = p_context_type
            AND n.context_id = p_context_id
            AND n.created_at > now() - interval '5 minutes'
        ) THEN
          CONTINUE;
        END IF;
        
        INSERT INTO public.notifications (
          user_id, bu_id, type, title, message,
          context_type, context_id, context_url, actor_id,
          event_slug, metadata
        ) VALUES (
          v_recipient_id, p_bu_id, 'mention'::notification_type,
          COALESCE(p_title, v_event.name),
          COALESCE(p_message, v_event.description),
          p_context_type, p_context_id, p_context_url, p_actor_id,
          p_event_slug, p_metadata
        )
        RETURNING id INTO v_notification_id;
        
        RETURN NEXT v_notification_id;
        
      ELSE
        -- Queue for async delivery with dedupe_key
        INSERT INTO public.notification_outbox (
          bu_id, user_id, event_slug, channel_slug, payload, status, dedupe_key
        ) VALUES (
          p_bu_id, v_recipient_id, p_event_slug, v_channel,
          jsonb_build_object(
            'title', COALESCE(p_title, v_event.name),
            'message', COALESCE(p_message, v_event.description),
            'context_type', p_context_type,
            'context_id', p_context_id,
            'context_url', p_context_url,
            'actor_id', p_actor_id,
            'metadata', p_metadata,
            'severity', v_event.severity
          ),
          'pending',
          v_dedupe_key
        )
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING id INTO v_outbox_id;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.emit_notification_event IS 'v2.1.0 - Fixed external user detection to use pc.user_id instead of pc.profile_user_id';