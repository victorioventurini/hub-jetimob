
-- =============================================
-- Rewrite 5 ticket notification triggers
-- Enrich with: ticket_title, ticket_type, category, subcategory, actor_name, status labels
-- =============================================

-- Helper: translate ticket status to pt-BR label
CREATE OR REPLACE FUNCTION public.ticket_status_label(p_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'waiting'     THEN 'Aguardando'
    WHEN 'paused'      THEN 'Pausado'
    WHEN 'in_progress' THEN 'Em andamento'
    WHEN 'done'        THEN 'Concluído'
    WHEN 'discarded'   THEN 'Descartado'
    ELSE p_status
  END;
$$;

-- =============================================
-- 1. notify_ticket_status_changed
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket_title TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_old_status_label TEXT;
  v_new_status_label TEXT;
  v_ticket_type TEXT;
  v_category_name TEXT;
  v_subcategory_name TEXT;
  v_bu_name TEXT;
  v_recipients UUID[];
  v_actor_name TEXT;
  v_actor_auth_id UUID;
  v_contact_auth_id UUID;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_ticket_title := COALESCE(NEW.title, 'Sem título');
  v_old_status := OLD.status::TEXT;
  v_new_status := NEW.status::TEXT;
  v_old_status_label := public.ticket_status_label(v_old_status);
  v_new_status_label := public.ticket_status_label(v_new_status);

  -- Ticket type
  v_ticket_type := CASE WHEN NEW.type = 'internal' THEN 'Interno' ELSE 'Externo' END;

  -- Category & subcategory
  SELECT tc.name INTO v_category_name
  FROM public.ticket_categories tc WHERE tc.id = NEW.category_id;

  SELECT ts.name INTO v_subcategory_name
  FROM public.ticket_subcategories ts WHERE ts.id = NEW.subcategory_id;

  -- BU name
  SELECT bu.name INTO v_bu_name
  FROM public.bu_units bu WHERE bu.id = NEW.bu_id;

  -- Actor info
  SELECT p.display_name, p.user_id
  INTO v_actor_name, v_actor_auth_id
  FROM public.profiles p
  WHERE p.id = NEW.owner_user_id;

  v_actor_name := COALESCE(v_actor_name, 'Alguém');

  -- Recipients: internal participants
  SELECT ARRAY_AGG(DISTINCT p.user_id)
  INTO v_recipients
  FROM public.ticket_participants tp
  JOIN public.profiles p ON p.id = tp.profile_id
  WHERE tp.ticket_id = NEW.id
    AND tp.is_active = TRUE
    AND tp.participant_type = 'internal_user'
    AND p.user_id IS NOT NULL
    AND (v_actor_auth_id IS NULL OR p.user_id != v_actor_auth_id);

  -- External participants
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

  -- Assigned external contact
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

  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.status.changed',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_actor_auth_id,
    p_title := v_ticket_title,
    p_message := v_actor_name || ' alterou o status de ' || v_old_status_label || ' para ' || v_new_status_label,
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'ticket_title', v_ticket_title,
      'ticket_type', v_ticket_type,
      'category', COALESCE(v_category_name, '—'),
      'subcategory', COALESCE(v_subcategory_name, '—'),
      'old_status', v_old_status_label,
      'new_status', v_new_status_label,
      'actor_name', v_actor_name,
      'bu_name', COALESCE(v_bu_name, 'Hub')
    )
  );

  RETURN NEW;
END;
$function$;

-- =============================================
-- 2. notify_ticket_created
-- =============================================
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
  v_ticket_type TEXT;
  v_category_name TEXT;
  v_subcategory_name TEXT;
  v_bu_name TEXT;
  v_ticket_title TEXT;
BEGIN
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  v_ticket_title := COALESCE(NEW.title, 'Sem título');
  v_ticket_type := CASE WHEN NEW.type = 'internal' THEN 'Interno' ELSE 'Externo' END;

  -- Category & subcategory
  SELECT tc.name INTO v_category_name
  FROM public.ticket_categories tc WHERE tc.id = NEW.category_id;

  SELECT ts.name INTO v_subcategory_name
  FROM public.ticket_subcategories ts WHERE ts.id = NEW.subcategory_id;

  -- BU name
  SELECT bu.name INTO v_bu_name
  FROM public.bu_units bu WHERE bu.id = NEW.bu_id;

  -- Creator info
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

  -- Internal owner
  IF NEW.owner_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_owner_auth_id
    FROM public.profiles p
    WHERE p.id = NEW.owner_user_id AND p.user_id IS NOT NULL;

    IF v_owner_auth_id IS NOT NULL AND v_owner_auth_id IS DISTINCT FROM v_creator_auth_id THEN
      v_recipients := ARRAY_APPEND(v_recipients, v_owner_auth_id);
    END IF;
  END IF;

  -- External assigned contact
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

  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.created',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_creator_auth_id,
    p_title := v_ticket_title,
    p_message := COALESCE(v_creator_name, 'Alguém') || ' criou um novo ticket',
    p_context_type := 'ticket',
    p_context_id := NEW.id,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'ticket_title', v_ticket_title,
      'ticket_type', v_ticket_type,
      'category', COALESCE(v_category_name, '—'),
      'subcategory', COALESCE(v_subcategory_name, '—'),
      'creator_name', COALESCE(v_creator_name, 'Alguém'),
      'actor_name', COALESCE(v_creator_name, 'Alguém'),
      'bu_name', COALESCE(v_bu_name, 'Hub')
    )
  );

  RETURN NEW;
END;
$function$;

-- =============================================
-- 3. notify_ticket_assigned
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket_title TEXT;
  v_auth_user_id UUID;
  v_ticket_type TEXT;
  v_category_name TEXT;
  v_subcategory_name TEXT;
  v_bu_name TEXT;
  v_requester_name TEXT;
BEGIN
  IF OLD.owner_user_id IS NOT DISTINCT FROM NEW.owner_user_id THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_ticket_title := COALESCE(NEW.title, 'Sem título');
  v_ticket_type := CASE WHEN NEW.type = 'internal' THEN 'Interno' ELSE 'Externo' END;

  -- Category & subcategory
  SELECT tc.name INTO v_category_name
  FROM public.ticket_categories tc WHERE tc.id = NEW.category_id;

  SELECT ts.name INTO v_subcategory_name
  FROM public.ticket_subcategories ts WHERE ts.id = NEW.subcategory_id;

  -- BU name
  SELECT bu.name INTO v_bu_name
  FROM public.bu_units bu WHERE bu.id = NEW.bu_id;

  -- Requester name
  SELECT COALESCE(p.display_name, 'Alguém') INTO v_requester_name
  FROM public.profiles p WHERE p.id = NEW.created_by_user_id;

  -- Recipient auth id
  SELECT user_id INTO v_auth_user_id
  FROM public.profiles
  WHERE id = NEW.owner_user_id;

  IF v_auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.assigned',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := ARRAY[v_auth_user_id],
    p_actor_id := NULL,
    p_title := v_ticket_title,
    p_message := 'Você foi atribuído ao ticket "' || v_ticket_title || '"',
    p_context_type := 'ticket',
    p_context_id := NEW.id::TEXT,
    p_context_url := '/go/ticket/' || NEW.id,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.id,
      'ticket_title', v_ticket_title,
      'ticket_type', v_ticket_type,
      'category', COALESCE(v_category_name, '—'),
      'subcategory', COALESCE(v_subcategory_name, '—'),
      'requester_name', COALESCE(v_requester_name, '—'),
      'bu_name', COALESCE(v_bu_name, 'Hub')
    )
  );

  RETURN NEW;
END;
$function$;

-- =============================================
-- 4. notify_ticket_message_created
-- =============================================
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
  v_context_url TEXT;
  v_ticket_type TEXT;
  v_category_name TEXT;
  v_subcategory_name TEXT;
  v_bu_name TEXT;
BEGIN
  IF NEW.author_type = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT t.id, t.bu_id, t.title, t.assigned_contact_id, t.owner_user_id, t.type, t.category_id, t.subcategory_id
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = NEW.ticket_id;

  IF v_ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ticket type, category, subcategory, BU
  v_ticket_type := CASE WHEN v_ticket.type = 'internal' THEN 'Interno' ELSE 'Externo' END;

  SELECT tc.name INTO v_category_name
  FROM public.ticket_categories tc WHERE tc.id = v_ticket.category_id;

  SELECT ts.name INTO v_subcategory_name
  FROM public.ticket_subcategories ts WHERE ts.id = v_ticket.subcategory_id;

  SELECT bu.name INTO v_bu_name
  FROM public.bu_units bu WHERE bu.id = v_ticket.bu_id;

  -- Author info
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

  -- Message snippet
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

  v_context_url := '/go/ticket/' || NEW.ticket_id::TEXT;
  v_recipients := ARRAY[]::UUID[];

  -- Internal owner
  IF v_ticket.owner_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_owner_auth_id
    FROM public.profiles p WHERE p.id = v_ticket.owner_user_id AND p.user_id IS NOT NULL;

    IF v_owner_auth_id IS NOT NULL AND v_owner_auth_id IS DISTINCT FROM v_author_auth_id THEN
      v_recipients := ARRAY_APPEND(v_recipients, v_owner_auth_id);
    END IF;
  END IF;

  -- Internal participants
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

  -- External participants
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

  -- Assigned external contact
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

  PERFORM public.emit_notification_event(
    p_event_slug := 'ticket.message.created',
    p_bu_id := v_ticket.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_author_auth_id,
    p_title := COALESCE(v_ticket.title, 'Sem título'),
    p_message := COALESCE(v_author_name, 'Alguém') || ' respondeu: ' || v_message_snippet,
    p_context_type := 'ticket',
    p_context_id := NEW.ticket_id,
    p_context_url := v_context_url,
    p_metadata := jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'ticket_title', COALESCE(v_ticket.title, 'Sem título'),
      'ticket_type', v_ticket_type,
      'category', COALESCE(v_category_name, '—'),
      'subcategory', COALESCE(v_subcategory_name, '—'),
      'message_id', NEW.id,
      'actor_name', COALESCE(v_author_name, 'Alguém'),
      'message', v_message_snippet,
      'bu_name', COALESCE(v_bu_name, 'Hub')
    )
  );

  RETURN NEW;
END;
$function$;

-- =============================================
-- 5. notify_ticket_mention
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_ticket_mention()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket_id uuid;
  v_ticket_title text;
  v_ticket_type text;
  v_category_name text;
  v_subcategory_name text;
  v_bu_name text;
  v_author_auth_id uuid;
  v_author_name text;
  v_author_type text;
  v_recipient_auth_id uuid;
  v_context_url text;
  v_ticket_record RECORD;
BEGIN
  IF NEW.entity_type != 'ticket_message' THEN
    RETURN NEW;
  END IF;

  -- Get ticket info from the message
  SELECT
    tm.ticket_id,
    t.title,
    t.type,
    t.category_id,
    t.subcategory_id,
    t.bu_id,
    tm.author_type,
    tm.author_user_id,
    tm.author_contact_id
  INTO v_ticket_record
  FROM public.ticket_messages tm
  JOIN public.tickets t ON t.id = tm.ticket_id
  WHERE tm.id = NEW.entity_id;

  IF v_ticket_record.ticket_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_ticket_id := v_ticket_record.ticket_id;
  v_ticket_title := COALESCE(v_ticket_record.title, 'Sem título');
  v_ticket_type := CASE WHEN v_ticket_record.type = 'internal' THEN 'Interno' ELSE 'Externo' END;

  -- Category & subcategory
  SELECT tc.name INTO v_category_name
  FROM public.ticket_categories tc WHERE tc.id = v_ticket_record.category_id;

  SELECT ts.name INTO v_subcategory_name
  FROM public.ticket_subcategories ts WHERE ts.id = v_ticket_record.subcategory_id;

  -- BU name
  SELECT bu.name INTO v_bu_name
  FROM public.bu_units bu WHERE bu.id = v_ticket_record.bu_id;

  -- Author info
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

  v_context_url := '/go/ticket/' || v_ticket_id::text;

  -- Internal user mention
  IF NEW.mentioned_user_id IS NOT NULL THEN
    SELECT user_id INTO v_recipient_auth_id
    FROM public.profiles WHERE id = NEW.mentioned_user_id;

    IF v_recipient_auth_id IS NOT NULL AND v_recipient_auth_id IS DISTINCT FROM v_author_auth_id THEN
      PERFORM public.emit_notification_event(
        'mention.created',
        NEW.bu_id,
        ARRAY[v_recipient_auth_id],
        v_author_auth_id,
        v_ticket_title,
        COALESCE(v_author_name, 'Alguém') || ' mencionou você em um ticket',
        'ticket',
        v_ticket_id,
        v_context_url,
        jsonb_build_object(
          'mention_id', NEW.id,
          'ticket_id', v_ticket_id,
          'ticket_title', v_ticket_title,
          'ticket_type', v_ticket_type,
          'category', COALESCE(v_category_name, '—'),
          'subcategory', COALESCE(v_subcategory_name, '—'),
          'actor_name', COALESCE(v_author_name, 'Alguém'),
          'bu_name', COALESCE(v_bu_name, 'Hub')
        )
      );
    END IF;
  END IF;

  -- External contact mention
  IF NEW.mentioned_contact_id IS NOT NULL THEN
    DECLARE
      v_contact_auth_id uuid;
    BEGIN
      SELECT user_id INTO v_contact_auth_id
      FROM public.partner_contacts WHERE id = NEW.mentioned_contact_id;

      IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id IS DISTINCT FROM v_author_auth_id THEN
        PERFORM public.emit_notification_event(
          'mention.created',
          NEW.bu_id,
          ARRAY[v_contact_auth_id],
          v_author_auth_id,
          v_ticket_title,
          COALESCE(v_author_name, 'Alguém') || ' mencionou você em um ticket',
          'ticket',
          v_ticket_id,
          v_context_url,
          jsonb_build_object(
            'mention_id', NEW.id,
            'ticket_id', v_ticket_id,
            'ticket_title', v_ticket_title,
            'ticket_type', v_ticket_type,
            'category', COALESCE(v_category_name, '—'),
            'subcategory', COALESCE(v_subcategory_name, '—'),
            'actor_name', COALESCE(v_author_name, 'Alguém'),
            'bu_name', COALESCE(v_bu_name, 'Hub'),
            'is_external', true
          )
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
