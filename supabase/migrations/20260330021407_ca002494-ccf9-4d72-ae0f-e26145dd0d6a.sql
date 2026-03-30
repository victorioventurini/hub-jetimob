
-- =============================================
-- Project Notifications: helpers, events, triggers, templates, backfill
-- =============================================

-- 1. Helper functions (pt-BR labels)
CREATE OR REPLACE FUNCTION public.project_status_label(p_status TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_status
    WHEN 'planned'     THEN 'Planejado'
    WHEN 'in_progress' THEN 'Em andamento'
    WHEN 'paused'      THEN 'Pausado'
    WHEN 'done'        THEN 'Concluído'
    WHEN 'cancelled'   THEN 'Cancelado'
    ELSE p_status
  END;
$$;

CREATE OR REPLACE FUNCTION public.milestone_status_label(p_status TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_status
    WHEN 'todo'        THEN 'A fazer'
    WHEN 'in_progress' THEN 'Em andamento'
    WHEN 'done'        THEN 'Concluído'
    ELSE p_status
  END;
$$;

-- 2. Register notification events
INSERT INTO public.notification_events (slug, module, name, description, audience, severity, is_mandatory, default_channels)
VALUES
  ('project.status.changed', 'projects', 'Status do Projeto Alterado', 'Notifica quando o status de um projeto é alterado', 'internal', 'info', false, '{in_app,email}'),
  ('milestone.status.changed', 'projects', 'Status da Milestone Alterado', 'Notifica quando o status de uma milestone é alterado', 'internal', 'info', false, '{in_app,email}')
ON CONFLICT (slug) DO NOTHING;

-- 3. Trigger: notify_project_status_changed
CREATE OR REPLACE FUNCTION public.notify_project_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_label TEXT;
  v_new_label TEXT;
  v_bu_name TEXT;
  v_actor_name TEXT;
  v_actor_auth_id UUID;
  v_owner_auth_id UUID;
  v_recipients UUID[];
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_old_label := public.project_status_label(OLD.status::TEXT);
  v_new_label := public.project_status_label(NEW.status::TEXT);

  -- BU name
  SELECT bu.name INTO v_bu_name FROM public.bu_units bu WHERE bu.id = NEW.bu_id;

  -- Owner → auth.users.id (owner_id = profiles.id per IDENTITY_CONVENTION)
  SELECT p.user_id, p.display_name
  INTO v_owner_auth_id, v_actor_name
  FROM public.profiles p WHERE p.id = NEW.owner_id;

  -- The actor is the session user (the one who triggered the update)
  v_actor_auth_id := auth.uid();

  -- If we can resolve actor name from auth.uid()
  IF v_actor_auth_id IS NOT NULL AND v_actor_auth_id IS DISTINCT FROM v_owner_auth_id THEN
    SELECT p.display_name INTO v_actor_name
    FROM public.profiles p WHERE p.user_id = v_actor_auth_id;
  END IF;
  v_actor_name := COALESCE(v_actor_name, 'Alguém');

  -- Recipients: project owner
  v_recipients := ARRAY[]::UUID[];
  IF v_owner_auth_id IS NOT NULL THEN
    v_recipients := ARRAY[v_owner_auth_id];
  END IF;

  -- + team members via project_teams → user_team_memberships → profiles
  SELECT ARRAY_AGG(DISTINCT combined.uid) INTO v_recipients
  FROM (
    SELECT UNNEST(v_recipients) AS uid
    UNION
    SELECT p.user_id AS uid
    FROM public.project_teams pt
    JOIN public.user_team_memberships utm ON utm.team_id = pt.team_id AND utm.is_active = true
    JOIN public.profiles p ON p.id = utm.user_id AND p.user_id IS NOT NULL
    WHERE pt.project_id = NEW.id
  ) combined
  WHERE combined.uid IS NOT NULL;

  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM public.emit_notification_event(
    p_event_slug := 'project.status.changed',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_actor_auth_id,
    p_title := NEW.name,
    p_message := COALESCE(v_actor_name, 'Alguém') || ' alterou o status de ' || v_old_label || ' para ' || v_new_label,
    p_context_type := 'project',
    p_context_id := NEW.id,
    p_context_url := '/projects/' || NEW.id::TEXT,
    p_metadata := jsonb_build_object(
      'project_id', NEW.id,
      'project_name', NEW.name,
      'old_status', v_old_label,
      'new_status', v_new_label,
      'actor_name', COALESCE(v_actor_name, 'Alguém'),
      'bu_name', COALESCE(v_bu_name, 'Hub')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_status_changed ON public.projects;
CREATE TRIGGER trg_notify_project_status_changed
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_project_status_changed();

-- 4. Trigger: notify_milestone_status_changed
CREATE OR REPLACE FUNCTION public.notify_milestone_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_label TEXT;
  v_new_label TEXT;
  v_project RECORD;
  v_bu_name TEXT;
  v_actor_name TEXT;
  v_actor_auth_id UUID;
  v_owner_auth_id UUID;
  v_milestone_owner_auth_id UUID;
  v_recipients UUID[];
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_old_label := public.milestone_status_label(OLD.status::TEXT);
  v_new_label := public.milestone_status_label(NEW.status::TEXT);

  -- Parent project
  SELECT pr.id, pr.name, pr.owner_id, pr.bu_id
  INTO v_project
  FROM public.projects pr WHERE pr.id = NEW.project_id;

  IF v_project IS NULL THEN
    RETURN NEW;
  END IF;

  -- BU name
  SELECT bu.name INTO v_bu_name FROM public.bu_units bu WHERE bu.id = v_project.bu_id;

  -- Project owner auth id
  SELECT p.user_id INTO v_owner_auth_id
  FROM public.profiles p WHERE p.id = v_project.owner_id;

  -- Milestone owner auth id (if different)
  IF NEW.owner_id IS NOT NULL THEN
    SELECT p.user_id INTO v_milestone_owner_auth_id
    FROM public.profiles p WHERE p.id = NEW.owner_id;
  END IF;

  -- Actor
  v_actor_auth_id := auth.uid();
  SELECT p.display_name INTO v_actor_name
  FROM public.profiles p WHERE p.user_id = v_actor_auth_id;
  v_actor_name := COALESCE(v_actor_name, 'Alguém');

  -- Recipients: project owner + milestone owner
  v_recipients := ARRAY[]::UUID[];
  IF v_owner_auth_id IS NOT NULL THEN
    v_recipients := ARRAY[v_owner_auth_id];
  END IF;
  IF v_milestone_owner_auth_id IS NOT NULL AND v_milestone_owner_auth_id != ALL(v_recipients) THEN
    v_recipients := ARRAY_APPEND(v_recipients, v_milestone_owner_auth_id);
  END IF;

  -- + team members
  SELECT ARRAY_AGG(DISTINCT combined.uid) INTO v_recipients
  FROM (
    SELECT UNNEST(v_recipients) AS uid
    UNION
    SELECT p.user_id AS uid
    FROM public.project_teams pt
    JOIN public.user_team_memberships utm ON utm.team_id = pt.team_id AND utm.is_active = true
    JOIN public.profiles p ON p.id = utm.user_id AND p.user_id IS NOT NULL
    WHERE pt.project_id = NEW.project_id
  ) combined
  WHERE combined.uid IS NOT NULL;

  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM public.emit_notification_event(
    p_event_slug := 'milestone.status.changed',
    p_bu_id := v_project.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_actor_auth_id,
    p_title := v_project.name || ' / ' || NEW.name,
    p_message := COALESCE(v_actor_name, 'Alguém') || ' alterou a milestone "' || NEW.name || '" de ' || v_old_label || ' para ' || v_new_label,
    p_context_type := 'milestone',
    p_context_id := NEW.id,
    p_context_url := '/projects/' || v_project.id::TEXT,
    p_metadata := jsonb_build_object(
      'project_id', v_project.id,
      'project_name', v_project.name,
      'milestone_id', NEW.id,
      'milestone_name', NEW.name,
      'old_status', v_old_label,
      'new_status', v_new_label,
      'actor_name', COALESCE(v_actor_name, 'Alguém'),
      'bu_name', COALESCE(v_bu_name, 'Hub')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_milestone_status_changed ON public.project_milestones;
CREATE TRIGGER trg_notify_milestone_status_changed
  AFTER UPDATE ON public.project_milestones
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_milestone_status_changed();

-- 5. Trigger: notify_project_mention
CREATE OR REPLACE FUNCTION public.notify_project_mention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_comment RECORD;
  v_project RECORD;
  v_bu_name TEXT;
  v_author_auth_id UUID;
  v_author_name TEXT;
  v_recipient_auth_id UUID;
BEGIN
  IF NEW.entity_type != 'project_comment' THEN
    RETURN NEW;
  END IF;

  -- Get comment → project
  SELECT pc.project_id, pc.author_user_id
  INTO v_comment
  FROM public.project_comments pc
  WHERE pc.id = NEW.entity_id;

  IF v_comment IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pr.id, pr.name, pr.bu_id
  INTO v_project
  FROM public.projects pr WHERE pr.id = v_comment.project_id;

  IF v_project IS NULL THEN
    RETURN NEW;
  END IF;

  -- BU name
  SELECT bu.name INTO v_bu_name FROM public.bu_units bu WHERE bu.id = v_project.bu_id;

  -- Author info (author_user_id on project_comments = profiles.id)
  SELECT p.user_id, p.display_name
  INTO v_author_auth_id, v_author_name
  FROM public.profiles p WHERE p.id = v_comment.author_user_id;
  v_author_name := COALESCE(v_author_name, 'Alguém');

  -- Internal user mention
  IF NEW.mentioned_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_recipient_auth_id
    FROM public.profiles p WHERE p.id = NEW.mentioned_user_id;

    IF v_recipient_auth_id IS NOT NULL AND v_recipient_auth_id IS DISTINCT FROM v_author_auth_id THEN
      PERFORM public.emit_notification_event(
        'mention.created',
        NEW.bu_id,
        ARRAY[v_recipient_auth_id],
        v_author_auth_id,
        v_project.name,
        COALESCE(v_author_name, 'Alguém') || ' mencionou você em um projeto',
        'project',
        v_project.id,
        '/projects/' || v_project.id::TEXT,
        jsonb_build_object(
          'mention_id', NEW.id,
          'project_id', v_project.id,
          'project_name', v_project.name,
          'actor_name', COALESCE(v_author_name, 'Alguém'),
          'bu_name', COALESCE(v_bu_name, 'Hub')
        )
      );
    END IF;
  END IF;

  -- External contact mention
  IF NEW.mentioned_contact_id IS NOT NULL THEN
    DECLARE
      v_contact_auth_id UUID;
    BEGIN
      SELECT pc.user_id INTO v_contact_auth_id
      FROM public.partner_contacts pc WHERE pc.id = NEW.mentioned_contact_id;

      IF v_contact_auth_id IS NOT NULL AND v_contact_auth_id IS DISTINCT FROM v_author_auth_id THEN
        PERFORM public.emit_notification_event(
          'mention.created',
          NEW.bu_id,
          ARRAY[v_contact_auth_id],
          v_author_auth_id,
          v_project.name,
          COALESCE(v_author_name, 'Alguém') || ' mencionou você em um projeto',
          'project',
          v_project.id,
          '/projects/' || v_project.id::TEXT,
          jsonb_build_object(
            'mention_id', NEW.id,
            'project_id', v_project.id,
            'project_name', v_project.name,
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
$$;

DROP TRIGGER IF EXISTS trg_notify_project_mention ON public.mentions;
CREATE TRIGGER trg_notify_project_mention
  AFTER INSERT ON public.mentions
  FOR EACH ROW
  WHEN (NEW.entity_type = 'project_comment')
  EXECUTE FUNCTION public.notify_project_mention();

-- 6. Email templates
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active)
VALUES
  ('project.status.changed', 'email',
   '[{{bu_name}}] {{project_name}} — {{new_status}}',
   '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;"><strong>{{actor_name}}</strong> alterou o status de um projeto na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Projeto:</strong> {{project_name}}</p>
    <p style="margin: 0 0 8px;"><strong>Status anterior:</strong> {{old_status}}</p>
    <p style="margin: 0;"><strong>Novo status:</strong> {{new_status}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin-top: 16px;">Ver Projeto</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
   1, true),

  ('milestone.status.changed', 'email',
   '[{{bu_name}}] {{project_name}} / {{milestone_name}} — {{new_status}}',
   '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Olá <strong>{{user_name}}</strong>,</p>
  <p style="margin: 0 0 16px;"><strong>{{actor_name}}</strong> alterou o status de uma milestone na <strong>{{bu_name}}</strong>.</p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Projeto:</strong> {{project_name}}</p>
    <p style="margin: 0 0 8px;"><strong>Milestone:</strong> {{milestone_name}}</p>
    <p style="margin: 0 0 8px;"><strong>Status anterior:</strong> {{old_status}}</p>
    <p style="margin: 0;"><strong>Novo status:</strong> {{new_status}}</p>
  </div>
  <a href="{{context_url}}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin-top: 16px;">Ver Projeto</a>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
  <p style="color: #71717a; font-size: 14px; margin: 0;">Hub da {{bu_name}}</p>
</div>',
   1, true)
ON CONFLICT DO NOTHING;

-- 7. Backfill bu_notification_event_settings for existing BUs
INSERT INTO public.bu_notification_event_settings (bu_id, event_slug, channel, is_enabled)
SELECT bu.id, ev.slug, ch.channel, true
FROM public.bu_units bu
CROSS JOIN (VALUES ('project.status.changed'), ('milestone.status.changed')) AS ev(slug)
CROSS JOIN (VALUES ('in_app'), ('email')) AS ch(channel)
ON CONFLICT DO NOTHING;
