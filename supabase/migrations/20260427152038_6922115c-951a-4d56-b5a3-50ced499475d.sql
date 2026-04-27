-- ============================================================================
-- 1. Helper: _project_email_metadata
-- ============================================================================
CREATE OR REPLACE FUNCTION public._project_email_metadata(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project    RECORD;
  v_bu_name    TEXT;
  v_owner_name TEXT;
  v_status     TEXT;
  v_start_fmt  TEXT;
  v_due_fmt    TEXT;
BEGIN
  SELECT pr.id, pr.name, pr.owner_id, pr.status, pr.start_date, pr.due_date, pr.bu_id
  INTO v_project
  FROM public.projects pr
  WHERE pr.id = p_project_id;

  IF v_project IS NULL THEN
    RETURN jsonb_build_object(
      'project_id',          p_project_id,
      'project_name',        '—',
      'bu_name',             'Hub',
      'project_owner_name',  'Não atribuído',
      'project_start_at',    '—',
      'project_due_at',      '—',
      'project_status',      '—',
      'project_url',         '/projects/' || p_project_id::TEXT
    );
  END IF;

  SELECT bu.name INTO v_bu_name FROM public.bu_units bu WHERE bu.id = v_project.bu_id;

  IF v_project.owner_id IS NOT NULL THEN
    SELECT COALESCE(p.display_name, p.email)
    INTO v_owner_name
    FROM public.profiles p
    WHERE p.id = v_project.owner_id;
  END IF;

  v_status := public.project_status_label(v_project.status::TEXT);

  IF v_project.start_date IS NOT NULL THEN
    v_start_fmt := to_char(v_project.start_date, 'DD/MM/YYYY');
  END IF;

  IF v_project.due_date IS NOT NULL THEN
    v_due_fmt := to_char(v_project.due_date, 'DD/MM/YYYY');
  END IF;

  RETURN jsonb_build_object(
    'project_id',          v_project.id,
    'project_name',        COALESCE(v_project.name, '—'),
    'bu_name',             COALESCE(v_bu_name, 'Hub'),
    'project_owner_name',  COALESCE(v_owner_name, 'Não atribuído'),
    'project_start_at',    COALESCE(v_start_fmt, '—'),
    'project_due_at',      COALESCE(v_due_fmt, '—'),
    'project_status',      COALESCE(v_status, '—'),
    'project_url',         '/projects/' || v_project.id::TEXT
  );
END;
$$;

-- ============================================================================
-- 2. Helper: _milestone_email_metadata
-- ============================================================================
CREATE OR REPLACE FUNCTION public._milestone_email_metadata(p_milestone_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_milestone   RECORD;
  v_owner_name  TEXT;
  v_status      TEXT;
  v_start_fmt   TEXT;
  v_due_fmt     TEXT;
  v_project_md  jsonb;
BEGIN
  SELECT pm.id, pm.project_id, pm.name, pm.owner_id, pm.status, pm.start_date, pm.due_date
  INTO v_milestone
  FROM public.project_milestones pm
  WHERE pm.id = p_milestone_id;

  IF v_milestone IS NULL THEN
    RETURN jsonb_build_object(
      'milestone_id',          p_milestone_id,
      'milestone_name',        '—',
      'milestone_owner_name',  'Não atribuído',
      'milestone_start_at',    '—',
      'milestone_due_at',      '—',
      'milestone_status',      '—'
    );
  END IF;

  v_project_md := public._project_email_metadata(v_milestone.project_id);

  IF v_milestone.owner_id IS NOT NULL THEN
    SELECT COALESCE(p.display_name, p.email)
    INTO v_owner_name
    FROM public.profiles p
    WHERE p.id = v_milestone.owner_id;
  END IF;

  v_status := public.milestone_status_label(v_milestone.status::TEXT);

  IF v_milestone.start_date IS NOT NULL THEN
    v_start_fmt := to_char(v_milestone.start_date, 'DD/MM/YYYY');
  END IF;

  IF v_milestone.due_date IS NOT NULL THEN
    v_due_fmt := to_char(v_milestone.due_date, 'DD/MM/YYYY');
  END IF;

  RETURN v_project_md || jsonb_build_object(
    'milestone_id',          v_milestone.id,
    'milestone_name',        COALESCE(v_milestone.name, '—'),
    'milestone_owner_name',  COALESCE(v_owner_name, 'Não atribuído'),
    'milestone_start_at',    COALESCE(v_start_fmt, '—'),
    'milestone_due_at',      COALESCE(v_due_fmt, '—'),
    'milestone_status',      COALESCE(v_status, '—')
  );
END;
$$;

-- ============================================================================
-- 3. Refatorar trigger: notify_project_status_changed
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_project_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old_label       TEXT;
  v_new_label       TEXT;
  v_actor_name      TEXT;
  v_actor_auth_id   UUID;
  v_owner_auth_id   UUID;
  v_recipients      UUID[];
  v_metadata        jsonb;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_old_label := public.project_status_label(OLD.status::TEXT);
  v_new_label := public.project_status_label(NEW.status::TEXT);

  SELECT p.user_id INTO v_owner_auth_id
  FROM public.profiles p WHERE p.id = NEW.owner_id;

  v_actor_auth_id := auth.uid();
  SELECT p.display_name INTO v_actor_name
  FROM public.profiles p WHERE p.user_id = v_actor_auth_id;
  v_actor_name := COALESCE(v_actor_name, 'Alguém');

  v_recipients := ARRAY[]::UUID[];
  IF v_owner_auth_id IS NOT NULL THEN
    v_recipients := ARRAY[v_owner_auth_id];
  END IF;

  SELECT ARRAY_AGG(DISTINCT combined.uid) INTO v_recipients
  FROM (
    SELECT UNNEST(v_recipients) AS uid
    UNION
    SELECT p.user_id AS uid
    FROM public.project_teams pt
    JOIN public.user_team_memberships utm ON utm.team_id = pt.team_id
    JOIN public.profiles p ON p.id = utm.user_id AND p.user_id IS NOT NULL
    WHERE pt.project_id = NEW.id
    UNION
    SELECT p.user_id AS uid
    FROM public.mentions m
    JOIN public.project_comments pc ON pc.id = m.entity_id AND pc.deleted_at IS NULL
    JOIN public.profiles p ON p.id = m.mentioned_user_id AND p.user_id IS NOT NULL
    WHERE m.entity_type = 'project_comment'
      AND pc.project_id = NEW.id
  ) combined
  WHERE combined.uid IS NOT NULL
    AND combined.uid IS DISTINCT FROM v_actor_auth_id;

  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  v_metadata := public._project_email_metadata(NEW.id) || jsonb_build_object(
    'title',       NEW.name,
    'old_status',  v_old_label,
    'new_status',  v_new_label,
    'actor_name',  v_actor_name
  );

  PERFORM public.emit_notification_event(
    p_event_slug         := 'project.status.changed',
    p_bu_id              := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id           := v_actor_auth_id,
    p_title              := NEW.name,
    p_message            := v_actor_name || ' alterou o status do projeto "' || NEW.name || '" de ' || v_old_label || ' para ' || v_new_label,
    p_context_type       := 'project',
    p_context_id         := NEW.id,
    p_context_url        := '/projects/' || NEW.id::TEXT,
    p_metadata           := v_metadata
  );

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 4. Refatorar trigger: notify_milestone_status_changed
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_milestone_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old_label              TEXT;
  v_new_label              TEXT;
  v_project                RECORD;
  v_actor_name             TEXT;
  v_actor_auth_id          UUID;
  v_owner_auth_id          UUID;
  v_milestone_owner_auth_id UUID;
  v_recipients             UUID[];
  v_metadata               jsonb;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_old_label := public.milestone_status_label(OLD.status::TEXT);
  v_new_label := public.milestone_status_label(NEW.status::TEXT);

  SELECT pr.id, pr.name, pr.owner_id, pr.bu_id
  INTO v_project
  FROM public.projects pr WHERE pr.id = NEW.project_id;

  IF v_project IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.user_id INTO v_owner_auth_id
  FROM public.profiles p WHERE p.id = v_project.owner_id;

  IF NEW.owner_id IS NOT NULL THEN
    SELECT p.user_id INTO v_milestone_owner_auth_id
    FROM public.profiles p WHERE p.id = NEW.owner_id;
  END IF;

  v_actor_auth_id := auth.uid();
  SELECT p.display_name INTO v_actor_name
  FROM public.profiles p WHERE p.user_id = v_actor_auth_id;
  v_actor_name := COALESCE(v_actor_name, 'Alguém');

  v_recipients := ARRAY[]::UUID[];
  IF v_owner_auth_id IS NOT NULL THEN
    v_recipients := ARRAY[v_owner_auth_id];
  END IF;
  IF v_milestone_owner_auth_id IS NOT NULL AND v_milestone_owner_auth_id != ALL(v_recipients) THEN
    v_recipients := ARRAY_APPEND(v_recipients, v_milestone_owner_auth_id);
  END IF;

  SELECT ARRAY_AGG(DISTINCT combined.uid) INTO v_recipients
  FROM (
    SELECT UNNEST(v_recipients) AS uid
    UNION
    SELECT p.user_id AS uid
    FROM public.project_teams pt
    JOIN public.user_team_memberships utm ON utm.team_id = pt.team_id
    JOIN public.profiles p ON p.id = utm.user_id AND p.user_id IS NOT NULL
    WHERE pt.project_id = NEW.project_id
    UNION
    SELECT p.user_id AS uid
    FROM public.mentions m
    JOIN public.project_comments pc ON pc.id = m.entity_id AND pc.deleted_at IS NULL
    JOIN public.profiles p ON p.id = m.mentioned_user_id AND p.user_id IS NOT NULL
    WHERE m.entity_type = 'project_comment'
      AND pc.project_id = NEW.project_id
  ) combined
  WHERE combined.uid IS NOT NULL
    AND combined.uid IS DISTINCT FROM v_actor_auth_id;

  IF v_recipients IS NULL OR ARRAY_LENGTH(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  v_metadata := public._milestone_email_metadata(NEW.id) || jsonb_build_object(
    'title',       v_project.name || ' / ' || NEW.name,
    'old_status',  v_old_label,
    'new_status',  v_new_label,
    'actor_name',  v_actor_name
  );

  PERFORM public.emit_notification_event(
    p_event_slug         := 'milestone.status.changed',
    p_bu_id              := v_project.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id           := v_actor_auth_id,
    p_title              := v_project.name || ' / ' || NEW.name,
    p_message            := v_actor_name || ' alterou a milestone "' || NEW.name || '" de ' || v_old_label || ' para ' || v_new_label,
    p_context_type       := 'milestone',
    p_context_id         := NEW.id,
    p_context_url        := '/projects/' || v_project.id::TEXT,
    p_metadata           := v_metadata
  );

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 5. Novo evento: project.mention.created
-- ============================================================================
INSERT INTO public.notification_events (slug, module, name, description, default_channels)
VALUES (
  'project.mention.created',
  'projects',
  'Menção em projeto',
  'Notifica quando um usuário é mencionado em um comentário de projeto',
  ARRAY['in_app','email']
)
ON CONFLICT (slug) DO UPDATE SET
  module           = EXCLUDED.module,
  name             = EXCLUDED.name,
  description      = EXCLUDED.description,
  default_channels = EXCLUDED.default_channels,
  updated_at       = now();

-- ============================================================================
-- 6. Refatorar trigger: notify_project_mention (usa novo evento)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_project_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_comment           RECORD;
  v_project           RECORD;
  v_author_auth_id    UUID;
  v_author_name       TEXT;
  v_recipient_auth_id UUID;
  v_metadata_base     jsonb;
BEGIN
  IF NEW.entity_type != 'project_comment' THEN
    RETURN NEW;
  END IF;

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

  SELECT p.user_id, p.display_name
  INTO v_author_auth_id, v_author_name
  FROM public.profiles p WHERE p.id = v_comment.author_user_id;
  v_author_name := COALESCE(v_author_name, 'Alguém');

  v_metadata_base := public._project_email_metadata(v_project.id);

  -- Internal user mention
  IF NEW.mentioned_user_id IS NOT NULL THEN
    SELECT p.user_id INTO v_recipient_auth_id
    FROM public.profiles p WHERE p.id = NEW.mentioned_user_id;

    IF v_recipient_auth_id IS NOT NULL AND v_recipient_auth_id IS DISTINCT FROM v_author_auth_id THEN
      PERFORM public.emit_notification_event(
        'project.mention.created',
        NEW.bu_id,
        ARRAY[v_recipient_auth_id],
        v_author_auth_id,
        v_project.name,
        v_author_name || ' mencionou você no projeto "' || v_project.name || '"',
        'project',
        v_project.id,
        '/projects/' || v_project.id::TEXT,
        v_metadata_base || jsonb_build_object(
          'mention_id',  NEW.id,
          'actor_name',  v_author_name,
          'title',       v_project.name
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
          'project.mention.created',
          NEW.bu_id,
          ARRAY[v_contact_auth_id],
          v_author_auth_id,
          v_project.name,
          v_author_name || ' mencionou você no projeto "' || v_project.name || '"',
          'project',
          v_project.id,
          '/projects/' || v_project.id::TEXT,
          v_metadata_base || jsonb_build_object(
            'mention_id',  NEW.id,
            'actor_name',  v_author_name,
            'title',       v_project.name,
            'is_external', true
          )
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 7. Templates de e-mail padronizados
-- ============================================================================

-- 7.1 project.status.changed (email) — UPDATE existente
UPDATE public.notification_templates
SET
  subject_template = '[{{bu_name}}] {{project_name}} — {{new_status}}',
  body_template = $BODY$<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:14px;line-height:1.5">
  <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a">Status do projeto atualizado</h2>
  <p style="margin:0 0 16px"><strong>{{actor_name}}</strong> alterou o status do projeto <strong>{{project_name}}</strong> de <strong>{{old_status}}</strong> para <strong>{{new_status}}</strong>.</p>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#0f172a">
    <p style="margin:0 0 8px"><strong>BU:</strong> {{bu_name}}</p>
    <p style="margin:0 0 8px"><strong>Projeto:</strong> {{project_name}}</p>
    <p style="margin:0 0 8px"><strong>Responsável:</strong> {{project_owner_name}}</p>
    <p style="margin:0 0 8px"><strong>Início → Conclusão:</strong> {{project_start_at}} → {{project_due_at}}</p>
    <p style="margin:0"><strong>Status do projeto:</strong> {{new_status}}</p>
  </div>

  <p style="margin:24px 0 0">
    <a href="{{app_url}}{{context_url}}" style="background:#0f172a;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Abrir projeto no Hub</a>
  </p>
</div>$BODY$,
  is_active = true,
  updated_at = now()
WHERE event_slug = 'project.status.changed' AND channel = 'email' AND version = 1;

-- 7.2 milestone.status.changed (email) — UPDATE existente
UPDATE public.notification_templates
SET
  subject_template = '[{{bu_name}}] {{project_name}} / {{milestone_name}} — {{new_status}}',
  body_template = $BODY$<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:14px;line-height:1.5">
  <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a">Status da milestone atualizado</h2>
  <p style="margin:0 0 16px"><strong>{{actor_name}}</strong> alterou a milestone <strong>{{milestone_name}}</strong> de <strong>{{old_status}}</strong> para <strong>{{new_status}}</strong>.</p>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#0f172a">
    <p style="margin:0 0 8px"><strong>BU:</strong> {{bu_name}}</p>
    <p style="margin:0 0 8px"><strong>Projeto:</strong> {{project_name}}</p>
    <p style="margin:0 0 8px"><strong>Responsável pelo projeto:</strong> {{project_owner_name}}</p>
    <p style="margin:0 0 8px"><strong>Projeto — Início → Conclusão:</strong> {{project_start_at}} → {{project_due_at}}</p>
    <p style="margin:0"><strong>Status do projeto:</strong> {{project_status}}</p>
  </div>

  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#0f172a">
    <p style="margin:0 0 8px"><strong>Milestone:</strong> {{milestone_name}}</p>
    <p style="margin:0 0 8px"><strong>Responsável:</strong> {{milestone_owner_name}}</p>
    <p style="margin:0 0 8px"><strong>Milestone — Início → Conclusão:</strong> {{milestone_start_at}} → {{milestone_due_at}}</p>
    <p style="margin:0"><strong>Status:</strong> {{new_status}}</p>
  </div>

  <p style="margin:24px 0 0">
    <a href="{{app_url}}{{context_url}}" style="background:#0f172a;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Abrir projeto no Hub</a>
  </p>
</div>$BODY$,
  is_active = true,
  updated_at = now()
WHERE event_slug = 'milestone.status.changed' AND channel = 'email' AND version = 1;

-- 7.3 project.mention.created (email) — INSERT novo
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active)
VALUES (
  'project.mention.created',
  'email',
  '[{{bu_name}}] {{project_name}} — Você foi mencionado',
  $BODY$<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:14px;line-height:1.5">
  <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a">Você foi mencionado em um projeto</h2>
  <p style="margin:0 0 16px"><strong>{{actor_name}}</strong> mencionou você no projeto <strong>{{project_name}}</strong>.</p>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#0f172a">
    <p style="margin:0 0 8px"><strong>BU:</strong> {{bu_name}}</p>
    <p style="margin:0 0 8px"><strong>Projeto:</strong> {{project_name}}</p>
    <p style="margin:0 0 8px"><strong>Responsável:</strong> {{project_owner_name}}</p>
    <p style="margin:0 0 8px"><strong>Início → Conclusão:</strong> {{project_start_at}} → {{project_due_at}}</p>
    <p style="margin:0"><strong>Status do projeto:</strong> {{project_status}}</p>
  </div>

  <p style="margin:24px 0 0">
    <a href="{{app_url}}{{context_url}}" style="background:#0f172a;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Abrir projeto no Hub</a>
  </p>
</div>$BODY$,
  1,
  true
)
ON CONFLICT (event_slug, channel, version) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  body_template    = EXCLUDED.body_template,
  is_active        = true,
  updated_at       = now();

-- 7.4 project.mention.created (in_app) — INSERT novo
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template, version, is_active)
VALUES (
  'project.mention.created',
  'in_app',
  '{{actor_name}} mencionou você em {{project_name}}',
  '{{actor_name}} mencionou você no projeto "{{project_name}}".',
  1,
  true
)
ON CONFLICT (event_slug, channel, version) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  body_template    = EXCLUDED.body_template,
  is_active        = true,
  updated_at       = now();