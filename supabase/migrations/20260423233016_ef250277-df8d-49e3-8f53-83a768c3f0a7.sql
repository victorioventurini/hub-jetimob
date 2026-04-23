
-- ============================================================
-- 1. DROP duplicate mention trigger (causes double-fire on tickets)
-- ============================================================
DROP TRIGGER IF EXISTS trg_notify_mention ON public.mentions;

-- ============================================================
-- 2. Refactor notify_project_status_changed to include watchers
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_project_status_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT bu.name INTO v_bu_name FROM public.bu_units bu WHERE bu.id = NEW.bu_id;

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

  -- Combine: owner + project teams + watchers (mentioned in comments)
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
    -- Watchers: users mentioned in any non-deleted comment of this project
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

  PERFORM public.emit_notification_event(
    p_event_slug := 'project.status.changed',
    p_bu_id := NEW.bu_id,
    p_recipient_user_ids := v_recipients,
    p_actor_id := v_actor_auth_id,
    p_title := NEW.name,
    p_message := COALESCE(v_actor_name, 'Alguém') || ' alterou o status do projeto "' || NEW.name || '" de ' || v_old_label || ' para ' || v_new_label,
    p_context_type := 'project',
    p_context_id := NEW.id,
    p_context_url := '/projects/' || NEW.id::TEXT,
    p_metadata := jsonb_build_object(
      'project_id', NEW.id,
      'project_name', NEW.name,
      'title', NEW.name,
      'old_status', v_old_label,
      'new_status', v_new_label,
      'actor_name', COALESCE(v_actor_name, 'Alguém'),
      'bu_name', COALESCE(v_bu_name, 'Hub')
    )
  );

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 3. Refactor notify_milestone_status_changed to include watchers
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_milestone_status_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT pr.id, pr.name, pr.owner_id, pr.bu_id
  INTO v_project
  FROM public.projects pr WHERE pr.id = NEW.project_id;

  IF v_project IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT bu.name INTO v_bu_name FROM public.bu_units bu WHERE bu.id = v_project.bu_id;

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

  -- Combine: owners + project teams + watchers (mentioned in comments)
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
      'title', v_project.name || ' / ' || NEW.name,
      'old_status', v_old_label,
      'new_status', v_new_label,
      'actor_name', COALESCE(v_actor_name, 'Alguém'),
      'bu_name', COALESCE(v_bu_name, 'Hub')
    )
  );

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 4. Email templates for project.status.changed
-- ============================================================
INSERT INTO public.notification_templates (event_slug, channel, version, is_active, subject_template, body_template)
VALUES (
  'project.status.changed',
  'email',
  1,
  true,
  '[{{bu_name}}] {{project_name}} — {{new_status}}',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2 style="color: #0f172a; margin: 0 0 16px;">Status do projeto alterado</h2>
  <p style="font-size: 15px; line-height: 1.5;">
    <strong>{{actor_name}}</strong> alterou o status do projeto
    <strong>{{project_name}}</strong> de <em>{{old_status}}</em> para <strong>{{new_status}}</strong>.
  </p>
  <table style="margin: 16px 0; font-size: 14px;">
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Business Unit:</td><td>{{bu_name}}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Status anterior:</td><td>{{old_status}}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Novo status:</td><td><strong>{{new_status}}</strong></td></tr>
  </table>
  <p style="margin-top: 24px;">
    <a href="{{context_url}}" style="background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Abrir projeto</a>
  </p>
  <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">Hub da Jet · {{current_datetime}}</p>
</body>
</html>'
)
ON CONFLICT (event_slug, channel, version) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  is_active = true,
  updated_at = now();

-- ============================================================
-- 5. Email templates for milestone.status.changed
-- ============================================================
INSERT INTO public.notification_templates (event_slug, channel, version, is_active, subject_template, body_template)
VALUES (
  'milestone.status.changed',
  'email',
  1,
  true,
  '[{{bu_name}}] {{project_name}} / {{milestone_name}} — {{new_status}}',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2 style="color: #0f172a; margin: 0 0 16px;">Status da milestone alterado</h2>
  <p style="font-size: 15px; line-height: 1.5;">
    <strong>{{actor_name}}</strong> alterou a milestone
    <strong>{{milestone_name}}</strong> do projeto <strong>{{project_name}}</strong>
    de <em>{{old_status}}</em> para <strong>{{new_status}}</strong>.
  </p>
  <table style="margin: 16px 0; font-size: 14px;">
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Business Unit:</td><td>{{bu_name}}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Projeto:</td><td>{{project_name}}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Milestone:</td><td>{{milestone_name}}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Status anterior:</td><td>{{old_status}}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Novo status:</td><td><strong>{{new_status}}</strong></td></tr>
  </table>
  <p style="margin-top: 24px;">
    <a href="{{context_url}}" style="background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Abrir projeto</a>
  </p>
  <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">Hub da Jet · {{current_datetime}}</p>
</body>
</html>'
)
ON CONFLICT (event_slug, channel, version) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  is_active = true,
  updated_at = now();

-- ============================================================
-- 6. Ensure project events are in default_channels for in_app+email
-- ============================================================
UPDATE public.notification_events
SET default_channels = ARRAY['in_app','email']::text[]
WHERE slug IN ('project.status.changed','milestone.status.changed')
  AND NOT ('email' = ANY(default_channels));
