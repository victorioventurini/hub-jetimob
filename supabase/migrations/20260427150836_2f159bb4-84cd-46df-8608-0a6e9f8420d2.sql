-- Helper: monta jsonb canônico com 9 campos a partir do ticket_id
CREATE OR REPLACE FUNCTION public._ticket_email_metadata(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket RECORD;
  v_category text;
  v_subcategory text;
  v_bu_name text;
  v_responsible_name text;
  v_requester_name text;
  v_created_at_fmt text;
  v_status_label text;
BEGIN
  SELECT t.id, t.bu_id, t.title, t.type, t.status, t.created_at,
         t.category_id, t.subcategory_id,
         t.owner_user_id, t.assigned_contact_id, t.created_by_user_id
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = p_ticket_id;

  IF v_ticket.id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT tc.name INTO v_category
  FROM public.ticket_categories tc WHERE tc.id = v_ticket.category_id;

  SELECT ts.name INTO v_subcategory
  FROM public.ticket_subcategories ts WHERE ts.id = v_ticket.subcategory_id;

  SELECT bu.name INTO v_bu_name
  FROM public.bu_units bu WHERE bu.id = v_ticket.bu_id;

  IF v_ticket.owner_user_id IS NOT NULL THEN
    SELECT p.display_name INTO v_responsible_name
    FROM public.profiles p WHERE p.id = v_ticket.owner_user_id;
  END IF;

  IF v_responsible_name IS NULL AND v_ticket.assigned_contact_id IS NOT NULL THEN
    SELECT pc.name INTO v_responsible_name
    FROM public.partner_contacts pc WHERE pc.id = v_ticket.assigned_contact_id;
  END IF;

  SELECT p.display_name INTO v_requester_name
  FROM public.profiles p WHERE p.id = v_ticket.created_by_user_id;

  IF v_requester_name IS NULL THEN
    SELECT pc.name INTO v_requester_name
    FROM public.partner_contacts pc WHERE pc.id = v_ticket.created_by_user_id;
  END IF;

  v_created_at_fmt := to_char(
    v_ticket.created_at AT TIME ZONE 'America/Sao_Paulo',
    'DD/MM/YYYY "às" HH24:MI'
  );

  v_status_label := public.ticket_status_label(v_ticket.status::text);

  RETURN jsonb_build_object(
    'bu_name', COALESCE(v_bu_name, 'Hub'),
    'category', COALESCE(v_category, '—'),
    'subcategory', COALESCE(v_subcategory, '—'),
    'ticket_title', COALESCE(v_ticket.title, 'Sem título'),
    'ticket_type', CASE WHEN v_ticket.type = 'internal' THEN 'Interno' ELSE 'Externo' END,
    'responsible_name', COALESCE(v_responsible_name, 'Não atribuído'),
    'requester_name', COALESCE(v_requester_name, 'Alguém'),
    'ticket_created_at', COALESCE(v_created_at_fmt, '—'),
    'ticket_status', COALESCE(v_status_label, '—')
  );
END;
$$;

COMMENT ON FUNCTION public._ticket_email_metadata IS
  'SSOT para metadata de e-mails de tickets. Retorna 9 campos canônicos para uso em p_metadata de emit_notification_event.';

-- Novo evento: ticket.mention.created
INSERT INTO public.notification_events (
  slug, module, name, description, audience, severity, is_mandatory,
  default_channels, icon
)
VALUES (
  'ticket.mention.created',
  'tickets',
  'Menção em ticket',
  'Você foi mencionado em uma mensagem de ticket',
  'both',
  'info',
  false,
  ARRAY['in_app','email'],
  'AtSign'
)
ON CONFLICT (slug) DO NOTHING;

-- Atualiza notify_ticket_created
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_creator_name TEXT;
  v_creator_auth_id UUID;
  v_owner_auth_id UUID;
  v_contact_auth_id UUID;
  v_recipients UUID[];
  v_ctx jsonb;
BEGIN
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.display_name, 'Alguém'), p.user_id
  INTO v_creator_name, v_creator_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.created_by_user_id;

  IF v_creator_auth_id IS NULL THEN
    SELECT COALESCE(pc.name, 'Contato'), pc.user_id
    INTO v_creator_name, v_creator_auth_id
    FROM public.partner_contacts pc
    WHERE pc.id = NEW.created_by_user_id;
  END IF;

  v_recipients := ARRAY[]::UUID[];

  IF NEW.owner_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_owner_auth_id
    FROM public.profiles p
    WHERE p.id = NEW.owner_user_id AND p.user_id IS NOT NULL;

    IF v_owner_auth_id IS NOT NULL AND v_owner_auth_id IS DISTINCT FROM v_creator_auth_id THEN
      v_recipients := ARRAY_APPEND(v_recipients, v_owner_auth_id);
    END IF;
  END IF;

  IF NEW.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id INTO v_contact_auth_id
    FROM public.partner_contacts pc
    WHERE pc.id = NEW.assigned_contact_id
      AND pc.user_id IS NOT NULL AND pc.status = 'active' AND pc.deleted_at IS NULL;

    IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id IS DISTINCT FROM v_creator_auth_id THEN
      IF NOT (v_contact_auth_id = ANY(v_recipients)) THEN
        v_recipients := ARRAY_APPEND(v_recipients, v_contact_auth_id);
      END IF;
    END IF;
  END IF;

  IF ARRAY_LENGTH(v_recipients, 1) IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  v_ctx := public._ticket_email_metadata(NEW.id);

  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.created',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_creator_auth_id,
    p_title := COALESCE(NEW.title, 'Sem título'),
    p_message := COALESCE(v_creator_name, 'Alguém') || ' criou um novo ticket',
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := v_ctx || jsonb_build_object(
      'ticket_id', NEW.id,
      'creator_name', COALESCE(v_creator_name, 'Alguém'),
      'actor_name', COALESCE(v_creator_name, 'Alguém')
    )
  );

  RETURN NEW;
END;
$function$;

-- Atualiza notify_ticket_assigned
CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_user_id UUID;
  v_ctx jsonb;
BEGIN
  IF OLD.owner_user_id IS NOT DISTINCT FROM NEW.owner_user_id THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_auth_user_id
  FROM public.profiles
  WHERE id = NEW.owner_user_id;

  IF v_auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_ctx := public._ticket_email_metadata(NEW.id);

  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.assigned',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := ARRAY[v_auth_user_id],
    p_actor_id := NULL,
    p_title := COALESCE(NEW.title, 'Sem título'),
    p_message := 'Você foi atribuído ao ticket "' || COALESCE(NEW.title, 'Sem título') || '"',
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := v_ctx || jsonb_build_object('ticket_id', NEW.id)
  );

  RETURN NEW;
END;
$function$;

-- Atualiza notify_ticket_status_changed
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_status_label TEXT;
  v_new_status_label TEXT;
  v_recipients UUID[];
  v_actor_name TEXT;
  v_actor_auth_id UUID;
  v_contact_auth_id UUID;
  v_ctx jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_old_status_label := public.ticket_status_label(OLD.status::TEXT);
  v_new_status_label := public.ticket_status_label(NEW.status::TEXT);

  SELECT p.display_name, p.user_id
  INTO v_actor_name, v_actor_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.owner_user_id;

  v_actor_name := COALESCE(v_actor_name, 'Alguém');

  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
  WHERE tp.ticket_id = NEW.id
    AND tp.is_active = TRUE
    AND tp.participant_type = 'internal_user'
    AND p.user_id IS NOT NULL
    AND (v_actor_auth_id IS NULL OR p.user_id != v_actor_auth_id);

  SELECT ARRAY_AGG(DISTINCT combined.user_id)
  INTO v_recipients
  FROM (
    SELECT UNNEST(COALESCE(v_recipients, ARRAY[]::UUID[])) as user_id
    UNION
    SELECT pc.user_id
    FROM public.ticket_participants tp
    JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
    WHERE tp.ticket_id = NEW.id
      AND tp.is_active = TRUE
      AND tp.participant_type = 'partner_contact'
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL
      AND (v_actor_auth_id IS NULL OR pc.user_id != v_actor_auth_id)
  ) combined
  WHERE combined.user_id IS NOT NULL;

  IF NEW.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id
    INTO v_contact_auth_id
    FROM public.partner_contacts pc
    WHERE pc.id = NEW.assigned_contact_id
      AND pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL;

    IF v_contact_auth_id IS NOT NULL AND (v_actor_auth_id IS NULL OR v_contact_auth_id != v_actor_auth_id) THEN
      IF NOT (v_contact_auth_id = ANY(COALESCE(v_recipients, ARRAY[]::UUID[]))) THEN
        v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
      END IF;
    END IF;
  END IF;

  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  v_ctx := public._ticket_email_metadata(NEW.id);

  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.status.changed',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_actor_auth_id,
    p_title := COALESCE(NEW.title, 'Sem título'),
    p_message := v_actor_name || ' alterou o status de ' || v_old_status_label || ' para ' || v_new_status_label,
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := v_ctx || jsonb_build_object(
      'ticket_id', NEW.id,
      'old_status', v_old_status_label,
      'new_status', v_new_status_label,
      'actor_name', v_actor_name
    )
  );

  RETURN NEW;
END;
$function$;

-- Atualiza notify_ticket_message_created
CREATE OR REPLACE FUNCTION public.notify_ticket_message_created()
 RETURNS trigger
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
  v_owner_auth_id UUID;
  v_message_snippet TEXT;
  v_body_text TEXT;
  v_ctx jsonb;
BEGIN
  IF NEW.author_type = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT t.id, t.bu_id, t.title, t.assigned_contact_id, t.owner_user_id
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = NEW.ticket_id;

  IF v_ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.author_type = 'internal_user' AND NEW.author_user_id IS NOT NULL THEN
    SELECT COALESCE(p.display_name, 'Alguém'), p.user_id
    INTO v_author_name, v_author_auth_id
    FROM public.profiles p WHERE p.id = NEW.author_user_id;
  ELSIF NEW.author_type = 'partner_contact' AND NEW.author_contact_id IS NOT NULL THEN
    SELECT COALESCE(pc.name, 'Contato'), pc.user_id
    INTO v_author_name, v_author_auth_id
    FROM public.partner_contacts pc WHERE pc.id = NEW.author_contact_id;
  ELSE
    v_author_name := 'Alguém';
  END IF;

  IF NEW.body_richtext IS NOT NULL THEN
    v_body_text := NEW.body_richtext->>'content';
    IF v_body_text IS NULL AND jsonb_typeof(NEW.body_richtext->'content') = 'array' THEN
      v_body_text := NEW.body_richtext->'content'->0->'content'->0->>'text';
    END IF;
  END IF;

  v_message_snippet := LEFT(COALESCE(v_body_text, ''), 200);
  IF LENGTH(COALESCE(v_body_text, '')) > 200 THEN
    v_message_snippet := v_message_snippet || '...';
  END IF;

  v_recipients := ARRAY[]::UUID[];

  IF v_ticket.owner_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_owner_auth_id
    FROM public.profiles p WHERE p.id = v_ticket.owner_user_id AND p.user_id IS NOT NULL;

    IF v_owner_auth_id IS NOT NULL AND v_owner_auth_id IS DISTINCT FROM v_author_auth_id THEN
      v_recipients := ARRAY_APPEND(v_recipients, v_owner_auth_id);
    END IF;
  END IF;

  SELECT ARRAY_AGG(DISTINCT combined.user_id)
  INTO v_recipients
  FROM (
    SELECT UNNEST(v_recipients) as user_id
    UNION
    SELECT p.user_id
    FROM public.ticket_participants tp
    JOIN public.profiles p ON p.id = tp.profile_id
    WHERE tp.ticket_id = NEW.ticket_id
      AND tp.is_active = TRUE AND tp.participant_type = 'internal_user'
      AND p.user_id IS NOT NULL AND p.user_id IS DISTINCT FROM v_author_auth_id
  ) combined WHERE combined.user_id IS NOT NULL;

  SELECT ARRAY_AGG(DISTINCT combined.user_id)
  INTO v_recipients
  FROM (
    SELECT UNNEST(COALESCE(v_recipients, ARRAY[]::UUID[])) as user_id
    UNION
    SELECT pc.user_id
    FROM public.ticket_participants tp
    JOIN public.partner_contacts pc ON pc.id = tp.partner_contact_id
    WHERE tp.ticket_id = NEW.ticket_id
      AND tp.is_active = TRUE AND tp.participant_type = 'partner_contact'
      AND pc.user_id IS NOT NULL AND pc.status = 'active' AND pc.deleted_at IS NULL
      AND pc.user_id IS DISTINCT FROM v_author_auth_id
  ) combined WHERE combined.user_id IS NOT NULL;

  IF v_ticket.assigned_contact_id IS NOT NULL THEN
    SELECT pc.user_id INTO v_contact_auth_id
    FROM public.partner_contacts pc
    WHERE pc.id = v_ticket.assigned_contact_id
      AND pc.user_id IS NOT NULL AND pc.status = 'active' AND pc.deleted_at IS NULL;

    IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id IS DISTINCT FROM v_author_auth_id THEN
      IF NOT (v_contact_auth_id = ANY(COALESCE(v_recipients, ARRAY[]::UUID[]))) THEN
        v_recipients := ARRAY_APPEND(COALESCE(v_recipients, ARRAY[]::UUID[]), v_contact_auth_id);
      END IF;
    END IF;
  END IF;

  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  v_ctx := public._ticket_email_metadata(v_ticket.id);

  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.message.created',
    p_bu_id := v_ticket.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_author_auth_id,
    p_title := COALESCE(v_ticket.title, 'Sem título'),
    p_message := COALESCE(v_author_name, 'Alguém') || ' respondeu: ' || v_message_snippet,
    p_context_type := 'ticket',
    p_context_id := NEW.ticket_id,
    p_context_url := '/go/ticket/' || NEW.ticket_id::TEXT,
    p_metadata := v_ctx || jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'message_id', NEW.id,
      'actor_name', COALESCE(v_author_name, 'Alguém'),
      'message', v_message_snippet
    )
  );

  RETURN NEW;
END;
$function$;

-- Atualiza notify_ticket_mention → emite ticket.mention.created
CREATE OR REPLACE FUNCTION public.notify_ticket_mention()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket_id uuid;
  v_author_auth_id uuid;
  v_author_name text;
  v_recipient_auth_id uuid;
  v_ticket_record RECORD;
  v_ctx jsonb;
  v_message_snippet text;
BEGIN
  IF NEW.entity_type != 'ticket_message' THEN
    RETURN NEW;
  END IF;

  SELECT
    tm.ticket_id,
    tm.author_type,
    tm.author_user_id,
    tm.author_contact_id,
    tm.body_richtext
  INTO v_ticket_record
  FROM public.ticket_messages tm
  WHERE tm.id = NEW.entity_id;

  IF v_ticket_record.ticket_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_ticket_id := v_ticket_record.ticket_id;

  IF v_ticket_record.author_type = 'internal_user' AND v_ticket_record.author_user_id IS NOT NULL THEN
    SELECT p.user_id, p.display_name
    INTO v_author_auth_id, v_author_name
    FROM public.profiles p WHERE p.id = v_ticket_record.author_user_id;
  ELSIF v_ticket_record.author_type = 'partner_contact' AND v_ticket_record.author_contact_id IS NOT NULL THEN
    SELECT pc.user_id, pc.name
    INTO v_author_auth_id, v_author_name
    FROM public.partner_contacts pc WHERE pc.id = v_ticket_record.author_contact_id;
  ELSE
    v_author_auth_id := NULL;
    v_author_name := 'Alguém';
  END IF;

  v_message_snippet := NULL;
  IF v_ticket_record.body_richtext IS NOT NULL THEN
    v_message_snippet := v_ticket_record.body_richtext->>'content';
    IF v_message_snippet IS NULL AND jsonb_typeof(v_ticket_record.body_richtext->'content') = 'array' THEN
      v_message_snippet := v_ticket_record.body_richtext->'content'->0->'content'->0->>'text';
    END IF;
  END IF;
  v_message_snippet := LEFT(COALESCE(v_message_snippet, ''), 200);

  v_ctx := public._ticket_email_metadata(v_ticket_id);

  IF NEW.mentioned_user_id IS NOT NULL THEN
    SELECT user_id INTO v_recipient_auth_id
    FROM public.profiles WHERE id = NEW.mentioned_user_id;

    IF v_recipient_auth_id IS NOT NULL AND v_recipient_auth_id IS DISTINCT FROM v_author_auth_id THEN
      PERFORM public.emit_notification_event(
        'ticket.mention.created',
        NEW.bu_id,
        ARRAY[v_recipient_auth_id],
        v_author_auth_id,
        COALESCE(v_ctx->>'ticket_title', 'Sem título'),
        COALESCE(v_author_name, 'Alguém') || ' mencionou você em um ticket',
        'ticket',
        v_ticket_id,
        '/go/ticket/' || v_ticket_id::text,
        v_ctx || jsonb_build_object(
          'mention_id', NEW.id,
          'ticket_id', v_ticket_id,
          'actor_name', COALESCE(v_author_name, 'Alguém'),
          'message', v_message_snippet
        )
      );
    END IF;
  END IF;

  IF NEW.mentioned_contact_id IS NOT NULL THEN
    DECLARE
      v_contact_auth_id uuid;
    BEGIN
      SELECT user_id INTO v_contact_auth_id
      FROM public.partner_contacts WHERE id = NEW.mentioned_contact_id;

      IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id IS DISTINCT FROM v_author_auth_id THEN
        PERFORM public.emit_notification_event(
          'ticket.mention.created',
          NEW.bu_id,
          ARRAY[v_contact_auth_id],
          v_author_auth_id,
          COALESCE(v_ctx->>'ticket_title', 'Sem título'),
          COALESCE(v_author_name, 'Alguém') || ' mencionou você em um ticket',
          'ticket',
          v_ticket_id,
          '/go/ticket/' || v_ticket_id::text,
          v_ctx || jsonb_build_object(
            'mention_id', NEW.id,
            'ticket_id', v_ticket_id,
            'actor_name', COALESCE(v_author_name, 'Alguém'),
            'message', v_message_snippet,
            'is_external', true
          )
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$function$;