CREATE OR REPLACE FUNCTION public.rpc_decisions_inbox(
  p_bu_id uuid,
  p_user_profile_id uuid,
  p_scope text DEFAULT 'self'::text,
  p_team_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_area_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  decision jsonb,
  session_id uuid,
  wizard_type text,
  structure_version text,
  completed_at timestamp with time zone,
  team_id uuid,
  team_name text,
  cycle_id uuid,
  started_by uuid,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_status        TEXT := NULLIF(p_filters->>'status','');
  v_category      TEXT := NULLIF(p_filters->>'category','');
  v_wizard_type   TEXT := NULLIF(p_filters->>'wizard_type','');
  v_owner_id      UUID := NULLIF(p_filters->>'owner_profile_id','')::UUID;
  v_date_from     DATE := NULLIF(p_filters->>'date_from','')::DATE;
  v_date_to       DATE := NULLIF(p_filters->>'date_to','')::DATE;
  v_search        TEXT := NULLIF(p_filters->>'search','');
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      s.id AS session_id,
      s.wizard_type,
      COALESCE(s.structure_version, 'v1') AS structure_version,
      s.completed_at,
      s.team_id,
      t.name AS team_name,
      s.cycle_id,
      s.started_by,
      d.value AS decision_payload,
      -- Resolução do team_id efetivo da DECISÃO (não da sessão):
      -- 1) team_id da sessão (quando existir)
      -- 2) profiles.team_id do owner da decisão
      -- 3) profiles.team_id do started_by (criador da sessão)
      COALESCE(
        s.team_id,
        po.team_id,
        ps.team_id
      ) AS effective_team_id
    FROM public.okr_wizard_sessions s
    LEFT JOIN public.teams t ON t.id = s.team_id
    LEFT JOIN LATERAL (
      SELECT value
      FROM jsonb_array_elements(
        COALESCE(
          CASE
            WHEN jsonb_typeof(s.decisions) = 'array' AND jsonb_array_length(s.decisions) > 0
              THEN s.decisions
            ELSE NULL
          END,
          CASE
            WHEN s.reflection_data ? 'data'
              AND jsonb_typeof(s.reflection_data->'data'->'decisions') = 'array'
              THEN s.reflection_data->'data'->'decisions'
            ELSE '[]'::jsonb
          END
        )
      )
    ) d ON TRUE
    LEFT JOIN public.profiles po
      ON po.id = NULLIF(d.value->'owner'->>'id','')::uuid
    LEFT JOIN public.profiles ps
      ON ps.id = s.started_by
    WHERE s.bu_id = p_bu_id
      AND s.status IN ('completed', 'in_progress')
      AND d.value IS NOT NULL
  ),
  scoped AS (
    SELECT *
    FROM base b
    WHERE
      CASE
        WHEN p_scope = 'all' THEN TRUE
        WHEN p_scope = 'self' THEN
          (b.decision_payload->'owner'->>'id')::uuid = p_user_profile_id
          OR b.started_by = p_user_profile_id
          OR (
            jsonb_typeof(b.decision_payload->'mentions') = 'array'
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(b.decision_payload->'mentions') AS m(val)
              WHERE m.val = p_user_profile_id::text
            )
          )
        WHEN p_scope = 'team' THEN
          -- Team efetivo (sessão > owner > started_by) bate com algum dos times pedidos
          b.effective_team_id = ANY(p_team_ids)
          -- Fallback histórico: membership formal
          OR EXISTS (
            SELECT 1
            FROM public.user_team_memberships m
            WHERE m.user_id = (b.decision_payload->'owner'->>'id')::uuid
              AND m.team_id = ANY(p_team_ids)
          )
        WHEN p_scope = 'area' THEN
          -- Time efetivo pertence a alguma das áreas pedidas
          b.effective_team_id IN (
            SELECT tt.id
            FROM public.teams tt
            WHERE tt.area_id = ANY(p_area_ids)
              AND tt.deleted_at IS NULL
          )
          -- Fallback histórico: membership formal em time da área
          OR EXISTS (
            SELECT 1
            FROM public.user_team_memberships m
            JOIN public.teams tt ON tt.id = m.team_id
            WHERE m.user_id = (b.decision_payload->'owner'->>'id')::uuid
              AND tt.area_id = ANY(p_area_ids)
              AND tt.deleted_at IS NULL
          )
        ELSE FALSE
      END
  ),
  filtered AS (
    SELECT *
    FROM scoped s
    WHERE
      (
        v_status IS NULL
        OR v_status = 'all'
        OR (v_status = 'pending' AND COALESCE(s.decision_payload->>'followUpStatus','pending') <> 'done')
        OR (v_status = 'done' AND s.decision_payload->>'followUpStatus' = 'done')
      )
      AND (v_category IS NULL OR s.decision_payload->>'category' = v_category)
      AND (v_wizard_type IS NULL OR s.wizard_type = v_wizard_type)
      AND (v_owner_id IS NULL OR (s.decision_payload->'owner'->>'id')::uuid = v_owner_id)
      AND (v_date_from IS NULL OR s.completed_at::date >= v_date_from)
      AND (v_date_to IS NULL OR s.completed_at::date <= v_date_to)
      AND (v_search IS NULL OR s.decision_payload->>'text' ILIKE '%' || v_search || '%')
  ),
  ranked AS (
    SELECT DISTINCT ON (filtered.decision_payload->>'id', filtered.session_id)
      filtered.*
    FROM filtered
    ORDER BY filtered.decision_payload->>'id', filtered.session_id, filtered.completed_at DESC NULLS LAST
  ),
  counted AS (
    SELECT COUNT(*) OVER () AS total_count_value, ranked.*
    FROM ranked
  )
  SELECT
    counted.decision_payload AS decision,
    counted.session_id,
    counted.wizard_type,
    counted.structure_version,
    counted.completed_at,
    counted.team_id,
    counted.team_name,
    counted.cycle_id,
    counted.started_by,
    counted.total_count_value AS total_count
  FROM counted
  ORDER BY
    CASE WHEN COALESCE(counted.decision_payload->>'followUpStatus','pending') <> 'done' THEN 0 ELSE 1 END,
    NULLIF(counted.decision_payload->>'deadline','')::date NULLS LAST,
    counted.completed_at DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$function$;