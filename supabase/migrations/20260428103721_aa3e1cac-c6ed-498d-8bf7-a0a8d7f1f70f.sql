-- ============================================================================
-- 0) DATA FIX: Move metric com scope=area para scope=team
-- ============================================================================
ALTER TABLE public.kpi_metrics DISABLE TRIGGER USER;

DO $$
DECLARE
  v_team_id uuid;
BEGIN
  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.area_id = '29241e61-3638-4f05-b3bf-3392ac86a35a'
    AND t.deleted_at IS NULL
    AND t.status = 'active'
  ORDER BY t.created_at ASC
  LIMIT 1;

  UPDATE public.kpi_metrics
  SET scope = 'team',
      team_id = v_team_id,
      area_id = NULL,
      updated_at = now()
  WHERE id = '08217276-f56a-4cb4-b227-735860cef29d';
END $$;

ALTER TABLE public.kpi_metrics ENABLE TRIGGER USER;

-- ============================================================================
-- 1) Helper: user_can_manage_kpi
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_can_manage_kpi(
  p_profile_id uuid,
  p_kpi_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_bu_id uuid;
  v_scope kpi_scope;
  v_area_id uuid;
  v_team_id uuid;
  v_team_area_id uuid;
  v_parent uuid;
BEGIN
  IF p_profile_id IS NULL OR p_kpi_id IS NULL THEN RETURN false; END IF;

  SELECT k.bu_id, k.scope, k.area_id, k.team_id
  INTO v_bu_id, v_scope, v_area_id, v_team_id
  FROM public.kpi_metrics k
  WHERE k.id = p_kpi_id AND k.deleted_at IS NULL;

  IF v_bu_id IS NULL THEN RETURN false; END IF;

  SELECT p.user_id INTO v_user_id FROM public.profiles p WHERE p.id = p_profile_id;

  IF v_user_id IS NOT NULL AND (is_platform_admin(v_user_id) OR is_bu_admin(v_user_id, v_bu_id)) THEN
    RETURN true;
  END IF;

  IF has_permission(p_profile_id, v_bu_id, 'kpis.settings.manage:bu') THEN
    RETURN true;
  END IF;

  IF v_scope = 'org' THEN RETURN false; END IF;

  IF v_scope = 'area' AND v_area_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.areas a
      WHERE a.id = v_area_id AND a.deleted_at IS NULL
        AND (a.leader_user_id = p_profile_id OR a.co_leader_user_id = p_profile_id)
    );
  END IF;

  IF v_scope = 'team' AND v_team_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = v_team_id AND t.deleted_at IS NULL AND t.leader_user_id = p_profile_id
    ) THEN RETURN true; END IF;

    SELECT t.area_id INTO v_team_area_id FROM public.teams t WHERE t.id = v_team_id;
    IF v_team_area_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.areas a
      WHERE a.id = v_team_area_id AND a.deleted_at IS NULL
        AND (a.leader_user_id = p_profile_id OR a.co_leader_user_id = p_profile_id)
    ) THEN RETURN true; END IF;

    v_parent := (SELECT parent_team_id FROM public.teams WHERE id = v_team_id);
    WHILE v_parent IS NOT NULL LOOP
      IF EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = v_parent AND t.deleted_at IS NULL AND t.leader_user_id = p_profile_id
      ) THEN RETURN true; END IF;
      v_parent := (SELECT parent_team_id FROM public.teams WHERE id = v_parent);
    END LOOP;
  END IF;

  RETURN false;
END;
$$;

-- ============================================================================
-- 2) Helper: user_can_create_kpi
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_can_create_kpi(
  p_profile_id uuid,
  p_bu_id uuid,
  p_scope kpi_scope,
  p_area_id uuid,
  p_team_id uuid,
  p_indicator_type kpi_indicator_type
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_team_area_id uuid;
  v_parent uuid;
BEGIN
  IF p_profile_id IS NULL OR p_bu_id IS NULL OR p_scope IS NULL THEN RETURN false; END IF;

  SELECT p.user_id INTO v_user_id FROM public.profiles p WHERE p.id = p_profile_id;

  IF v_user_id IS NOT NULL AND (is_platform_admin(v_user_id) OR is_bu_admin(v_user_id, v_bu_id)) THEN
    RETURN true;
  END IF;

  IF has_permission(p_profile_id, v_bu_id, 'kpis.settings.manage:bu') THEN
    RETURN true;
  END IF;

  IF p_indicator_type = 'metric' THEN
    IF p_scope <> 'team' OR p_team_id IS NULL THEN RETURN false; END IF;
    IF EXISTS (
      SELECT 1 FROM public.user_team_memberships m
      WHERE m.team_id = p_team_id AND m.user_id = p_profile_id
    ) THEN RETURN true; END IF;
  END IF;

  IF p_scope = 'org' THEN RETURN false; END IF;

  IF p_scope = 'area' AND p_area_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.areas a
      WHERE a.id = p_area_id AND a.deleted_at IS NULL
        AND (a.leader_user_id = p_profile_id OR a.co_leader_user_id = p_profile_id)
    );
  END IF;

  IF p_scope = 'team' AND p_team_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = p_team_id AND t.deleted_at IS NULL AND t.leader_user_id = p_profile_id
    ) THEN RETURN true; END IF;

    SELECT t.area_id INTO v_team_area_id FROM public.teams t WHERE t.id = p_team_id;
    IF v_team_area_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.areas a
      WHERE a.id = v_team_area_id AND a.deleted_at IS NULL
        AND (a.leader_user_id = p_profile_id OR a.co_leader_user_id = p_profile_id)
    ) THEN RETURN true; END IF;

    v_parent := (SELECT parent_team_id FROM public.teams WHERE id = p_team_id);
    WHILE v_parent IS NOT NULL LOOP
      IF EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = v_parent AND t.deleted_at IS NULL AND t.leader_user_id = p_profile_id
      ) THEN RETURN true; END IF;
      v_parent := (SELECT parent_team_id FROM public.teams WHERE id = v_parent);
    END LOOP;
  END IF;

  RETURN false;
END;
$$;

-- ============================================================================
-- 3) Trigger enforce_metric_scope_team
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_metric_scope_team()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.indicator_type = 'metric' AND NEW.scope <> 'team' THEN
    RAISE EXCEPTION 'Métricas devem ter escopo de Time (scope=team). Recebido: %', NEW.scope
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.indicator_type = 'metric' AND NEW.team_id IS NULL THEN
    RAISE EXCEPTION 'Métricas devem ter um time atribuído (team_id obrigatório).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_metric_scope_team ON public.kpi_metrics;
CREATE TRIGGER trg_enforce_metric_scope_team
BEFORE INSERT OR UPDATE OF scope, team_id, indicator_type ON public.kpi_metrics
FOR EACH ROW EXECUTE FUNCTION public.enforce_metric_scope_team();

-- ============================================================================
-- 4) Replace RLS policies on kpi_metrics
-- ============================================================================
DROP POLICY IF EXISTS kpi_metrics_insert_v2 ON public.kpi_metrics;
DROP POLICY IF EXISTS kpi_metrics_update_v3 ON public.kpi_metrics;
DROP POLICY IF EXISTS kpi_metrics_delete_v2 ON public.kpi_metrics;

CREATE POLICY kpi_metrics_insert_v3 ON public.kpi_metrics
FOR INSERT TO authenticated
WITH CHECK (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND is_current_bu(bu_id)
  AND public.user_can_create_kpi(my_profile_id(), bu_id, scope, area_id, team_id, indicator_type)
);

CREATE POLICY kpi_metrics_update_v4 ON public.kpi_metrics
FOR UPDATE TO authenticated
USING (
  public.user_can_manage_kpi(my_profile_id(), id)
  OR owner_user_id = my_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.kpi_data_contributors kdc
    WHERE kdc.kpi_id = kpi_metrics.id
      AND kdc.contributor_user_id = my_profile_id()
      AND kdc.deleted_at IS NULL
  )
)
WITH CHECK (
  public.user_can_manage_kpi(my_profile_id(), id)
  OR owner_user_id = my_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.kpi_data_contributors kdc
    WHERE kdc.kpi_id = kpi_metrics.id
      AND kdc.contributor_user_id = my_profile_id()
      AND kdc.deleted_at IS NULL
  )
);

CREATE POLICY kpi_metrics_delete_v3 ON public.kpi_metrics
FOR DELETE TO authenticated
USING (
  public.user_can_manage_kpi(my_profile_id(), id)
  OR (
    indicator_type = 'metric' AND (
      owner_user_id = my_profile_id()
      OR EXISTS (
        SELECT 1 FROM public.kpi_data_contributors kdc
        WHERE kdc.kpi_id = kpi_metrics.id
          AND kdc.contributor_user_id = my_profile_id()
          AND kdc.deleted_at IS NULL
      )
    )
  )
);