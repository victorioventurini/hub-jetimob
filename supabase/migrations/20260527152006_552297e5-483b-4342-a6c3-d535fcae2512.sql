CREATE OR REPLACE FUNCTION public.emit_notification_event(
  p_event_slug text,
  p_bu_id uuid,
  p_recipient_user_ids uuid[],
  p_actor_id uuid DEFAULT NULL::uuid,
  p_title text DEFAULT NULL::text,
  p_message text DEFAULT NULL::text,
  p_context_type text DEFAULT NULL::text,
  p_context_id uuid DEFAULT NULL::uuid,
  p_context_url text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_dedupe_suffix TEXT;
BEGIN
  SELECT * INTO v_event FROM public.notification_events WHERE slug = p_event_slug;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Unknown notification event: %', p_event_slug;
  END IF;

  -- Per-event uniqueness suffix to avoid permanent dedupe across distinct
  -- occurrences (e.g. multiple mentions in the same ticket). Prefer a
  -- caller-provided unique id from metadata; fall back to a 5-minute bucket
  -- so behavior mirrors the in_app dedupe window.
  v_dedupe_suffix := COALESCE(
    p_metadata->>'mention_id',
    p_metadata->>'message_id',
    p_metadata->>'comment_id',
    p_metadata->>'checkin_id',
    p_metadata->>'addendum_id',
    p_metadata->>'transfer_id',
    to_char(date_trunc('hour', now()) + (floor(extract(minute from now())::int / 5) * interval '5 minute'), 'YYYYMMDDHH24MI')
  );

  FOREACH v_recipient_id IN ARRAY p_recipient_user_ids
  LOOP
    IF v_recipient_id = p_actor_id THEN
      CONTINUE;
    END IF;

    v_is_external := EXISTS (
      SELECT 1 FROM public.partner_contacts pc
      WHERE pc.user_id = v_recipient_id
        AND pc.status = 'active'
        AND pc.deleted_at IS NULL
    );

    IF v_is_external AND v_event.audience = 'internal' THEN CONTINUE; END IF;
    IF NOT v_is_external AND v_event.audience = 'external' THEN CONTINUE; END IF;

    FOREACH v_channel IN ARRAY v_event.default_channels
    LOOP
      IF v_channel != 'in_app' THEN
        SELECT is_enabled INTO v_channel_enabled
        FROM public.bu_notification_channels
        WHERE bu_id = p_bu_id AND channel_slug = v_channel;
        IF v_channel_enabled IS FALSE THEN CONTINUE; END IF;
      END IF;

      IF NOT v_event.is_mandatory THEN
        SELECT enabled INTO v_pref_enabled
        FROM public.user_notification_preferences_v2
        WHERE user_id = v_recipient_id
          AND bu_id = p_bu_id
          AND event_slug = p_event_slug
          AND channel_slug = v_channel;
        IF v_pref_enabled IS FALSE THEN CONTINUE; END IF;
      END IF;

      v_dedupe_key := p_event_slug || ':' || v_recipient_id::TEXT || ':' || v_channel || ':'
                      || COALESCE(p_context_type, 'null') || ':' || COALESCE(p_context_id::TEXT, 'null')
                      || ':' || v_dedupe_suffix;

      IF v_channel = 'in_app' THEN
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
$function$;