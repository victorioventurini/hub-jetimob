
-- ============================================================
-- rpc_decisions_inbox: extrai decisões de okr_wizard_sessions
-- aplicando escopo (self / team / area / all) com paginação.
-- ============================================================

-- Índice parcial para acelerar varredura de decisões.
CREATE INDEX IF NOT EXISTS idx_okr_wizard_sessions_bu_completed_decisions
  ON public.okr_wizard_sessions (bu_id, completed_at DESC NULLS LAST)
  WHERE status = 'completed' AND decisions IS NOT NULL;

-- Função: rpc_decisions_inbox
-- Parâmetros:
--   p_bu_id           BU corrente (obrigatório)
--   p_user_profile_id Profile do usuário (para escopo 'self')
--   p_scope           'self' | 'team' | 'area' | 'all'
--   p_team_ids        UUIDs (escopo 'team' já resolvidos no client, com sub-times)
--   p_area_ids        UUIDs (escopo 'area' já resolvidos no client)
--   p_filters         JSONB { status?, category?, wizard_type?, owner_profile_id?, date_from?, date_to?, search? }
--   p_limit           default 50
--   p_offset          default 0
--
-- Retorna lista achatada com metadados da sessão para a inbox.
CREATE OR REPLACE FUNCTION public.rpc_decisions_inbox(
  p_bu_id UUID,
  p_user_profile_id UUID,
  p_scope TEXT DEFAULT 'self',
  p_team_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_area_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_filters JSONB DEFAULT '{}'::JSONB,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  decision JSONB,
  session_id UUID,
  wizard_type TEXT,
  structure_version TEXT,
  completed_at TIMESTAMPTZ,
  team_id UUID,
  team_name TEXT,
  cycle_id UUID,
  started_by UUID,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_status        TEXT := NULLIF(p_filters->>'status','');     -- 'pending' | 'done' | 'all'
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
      s.id              AS session_id,
      s.wizard_type,
      COALESCE(s.structure_version, 'v1') AS structure_version,
      s.completed_at,
      s.team_id,
      t.name            AS team_name,
      s.cycle_id,
      s.started_by,
      -- Une `decisions` (top-level) com `reflection_data->'data'->'decisions'`
      -- removendo duplicatas por id usando DISTINCT no JSONB do id.
      d.value           AS decision
    FROM public.okr_wizard_sessions s
    LEFT JOIN public.teams t ON t.id = s.team_id
    LEFT JOIN LATERAL (
      SELECT value FROM jsonb_array_elements(
        COALESCE(
          CASE WHEN jsonb_typeof(s.decisions) = 'array' AND jsonb_array_length(s.decisions) > 0
               THEN s.decisions
               ELSE NULL END,
          CASE WHEN s.reflection_data ? 'data'
                AND jsonb_typeof(s.reflection_data->'data'->'decisions') = 'array'
               THEN s.reflection_data->'data'->'decisions'
               ELSE '[]'::jsonb END
        )
      )
    ) d ON TRUE
    WHERE s.bu_id = p_bu_id
      AND s.status = 'completed'
      AND d.value IS NOT NULL
  ),
  scoped AS (
    SELECT *
    FROM base
    WHERE
      CASE
        WHEN p_scope = 'all' THEN TRUE
        WHEN p_scope = 'self' THEN
          (decision->'owner'->>'id')::UUID = p_user_profile_id
          OR started_by = p_user_profile_id
        WHEN p_scope = 'team' THEN
          team_id = ANY(p_team_ids)
          OR EXISTS (
            SELECT 1 FROM public.user_team_memberships m
            WHERE m.profile_id = (decision->'owner'->>'id')::UUID
              AND m.deleted_at IS NULL
              AND m.team_id = ANY(p_team_ids)
          )
        WHEN p_scope = 'area' THEN
          team_id IN (
            SELECT id FROM public.teams
            WHERE area_id = ANY(p_area_ids) AND deleted_at IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM public.user_team_memberships m
            JOIN public.teams t2 ON t2.id = m.team_id
            WHERE m.profile_id = (decision->'owner'->>'id')::UUID
              AND m.deleted_at IS NULL
              AND t2.area_id = ANY(p_area_ids)
          )
        ELSE FALSE
      END
  ),
  filtered AS (
    SELECT *
    FROM scoped
    WHERE
      (v_status IS NULL
        OR v_status = 'all'
        OR (v_status = 'pending' AND COALESCE(decision->>'followUpStatus','pending') <> 'done')
        OR (v_status = 'done'    AND decision->>'followUpStatus' = 'done'))
      AND (v_category IS NULL OR decision->>'category' = v_category)
      AND (v_wizard_type IS NULL OR wizard_type = v_wizard_type)
      AND (v_owner_id IS NULL OR (decision->'owner'->>'id')::UUID = v_owner_id)
      AND (v_date_from IS NULL OR completed_at::DATE >= v_date_from)
      AND (v_date_to   IS NULL OR completed_at::DATE <= v_date_to)
      AND (v_search IS NULL OR decision->>'text' ILIKE '%' || v_search || '%')
  ),
  ranked AS (
    SELECT DISTINCT ON (decision->>'id', session_id) *
    FROM filtered
    ORDER BY decision->>'id', session_id, completed_at DESC NULLS LAST
  ),
  counted AS (
    SELECT COUNT(*) OVER () AS total_count, *
    FROM ranked
  )
  SELECT
    decision,
    session_id,
    wizard_type,
    structure_version,
    completed_at,
    team_id,
    team_name,
    cycle_id,
    started_by,
    total_count
  FROM counted
  ORDER BY
    -- Pendentes primeiro (com deadline mais antigo no topo), depois resolvidos.
    CASE WHEN COALESCE(decision->>'followUpStatus','pending') <> 'done' THEN 0 ELSE 1 END,
    NULLIF(decision->>'deadline','')::DATE NULLS LAST,
    completed_at DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_decisions_inbox(UUID, UUID, TEXT, UUID[], UUID[], JSONB, INT, INT) TO authenticated;
