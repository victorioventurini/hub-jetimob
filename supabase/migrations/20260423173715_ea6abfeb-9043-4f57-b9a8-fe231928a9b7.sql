-- Hotfix: ambas as funções de notificação referenciavam coluna inexistente
-- public.user_team_memberships.is_active. Recriar removendo o filtro inválido.

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

  -- HOTFIX: removed AND utm.is_active = true (column does not exist on user_team_memberships)
  SELECT ARRAY_AGG(DISTINCT combined.uid) INTO v_recipients
  FROM (
    SELECT UNNEST(v_recipients) AS uid
    UNION
    SELECT p.user_id AS uid
    FROM public.project_teams pt
    JOIN public.user_team_memberships utm ON utm.team_id = pt.team_id
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
$function$;

-- Mesma correção na função de projects (preserva lógica original)
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

  -- HOTFIX: removed AND utm.is_active = true (column does not exist on user_team_memberships)
  SELECT ARRAY_AGG(DISTINCT combined.uid) INTO v_recipients
  FROM (
    SELECT UNNEST(v_recipients) AS uid
    UNION
    SELECT p.user_id AS uid
    FROM public.project_teams pt
    JOIN public.user_team_memberships utm ON utm.team_id = pt.team_id
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
    p_message := COALESCE(v_actor_name, 'Alguém') || ' alterou o status do projeto "' || NEW.name || '" de ' || v_old_label || ' para ' || v_new_label,
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
$function$;