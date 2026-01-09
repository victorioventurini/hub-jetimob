
-- ==============================================================================
-- OKR TEAM SCOPE HARDENING
-- Garante que líderes só podem criar/gerenciar OKRs para seu time e descendentes
-- ==============================================================================

-- 1) Função auxiliar: retorna todos os times descendentes de um time (recursivo)
CREATE OR REPLACE FUNCTION public.get_descendant_team_ids(p_team_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE descendants AS (
    -- Base: o próprio time
    SELECT id FROM teams WHERE id = p_team_id AND deleted_at IS NULL
    UNION ALL
    -- Recursivo: filhos
    SELECT t.id 
    FROM teams t
    INNER JOIN descendants d ON t.parent_team_id = d.id
    WHERE t.deleted_at IS NULL
  )
  SELECT ARRAY_AGG(id) FROM descendants
$$;

-- 2) Função principal: retorna IDs dos times que o usuário pode gerenciar OKRs
-- Regra: próprio time (se líder) + todos descendentes + admin tem acesso total
CREATE OR REPLACE FUNCTION public.get_okr_manageable_team_ids(
  p_user_id uuid DEFAULT NULL,
  p_bu_id uuid DEFAULT NULL
)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_bu_id uuid := COALESCE(p_bu_id, current_bu_id());
  v_profile_id uuid;
  v_is_admin boolean;
  v_led_teams uuid[];
  v_result uuid[];
BEGIN
  IF v_user_id IS NULL OR v_bu_id IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  -- Check if user is admin (has full access)
  v_is_admin := is_platform_admin(v_user_id) OR is_bu_admin(v_user_id, v_bu_id);
  
  IF v_is_admin THEN
    -- Admin can manage all teams in the BU
    SELECT ARRAY_AGG(id) INTO v_result
    FROM teams
    WHERE bu_id = v_bu_id AND deleted_at IS NULL AND status = 'active';
    RETURN COALESCE(v_result, ARRAY[]::uuid[]);
  END IF;
  
  -- Get profile_id from user_id (since team relations use profiles.id)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  -- Get teams where user is direct leader
  SELECT ARRAY_AGG(id) INTO v_led_teams
  FROM teams
  WHERE leader_user_id = v_profile_id
    AND bu_id = v_bu_id
    AND deleted_at IS NULL
    AND status = 'active';
  
  IF v_led_teams IS NULL OR array_length(v_led_teams, 1) IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  -- Expand to include all descendants of each led team
  v_result := ARRAY[]::uuid[];
  FOR i IN 1..array_length(v_led_teams, 1) LOOP
    v_result := v_result || COALESCE(get_descendant_team_ids(v_led_teams[i]), ARRAY[]::uuid[]);
  END LOOP;

  RETURN v_result;
END;
$$;

-- 3) Função de verificação: pode o usuário gerenciar OKRs deste time?
CREATE OR REPLACE FUNCTION public.can_manage_team_okr(
  p_user_id uuid,
  p_team_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_team_id = ANY(get_okr_manageable_team_ids(p_user_id))
$$;

-- 4) Atualizar RLS para okr_team_objectives
-- Drop existing policies
DROP POLICY IF EXISTS "okr_team_objectives_manage" ON public.okr_team_objectives;
DROP POLICY IF EXISTS "okr_team_objectives_select" ON public.okr_team_objectives;
DROP POLICY IF EXISTS "okr_team_objectives_insert" ON public.okr_team_objectives;
DROP POLICY IF EXISTS "okr_team_objectives_update" ON public.okr_team_objectives;
DROP POLICY IF EXISTS "okr_team_objectives_delete" ON public.okr_team_objectives;

-- SELECT: qualquer membro da BU pode ver (leitura aberta dentro da BU)
CREATE POLICY "okr_team_objectives_select" 
ON public.okr_team_objectives 
FOR SELECT 
TO authenticated 
USING (is_bu_member(auth.uid(), bu_id));

-- INSERT: apenas quem pode gerenciar o time do OKR
CREATE POLICY "okr_team_objectives_insert" 
ON public.okr_team_objectives 
FOR INSERT 
TO authenticated 
WITH CHECK (
  is_bu_member(auth.uid(), bu_id) 
  AND can_manage_team_okr(auth.uid(), team_id)
);

-- UPDATE: apenas quem pode gerenciar o time do OKR
CREATE POLICY "okr_team_objectives_update" 
ON public.okr_team_objectives 
FOR UPDATE 
TO authenticated 
USING (
  is_bu_member(auth.uid(), bu_id) 
  AND can_manage_team_okr(auth.uid(), team_id)
)
WITH CHECK (
  is_bu_member(auth.uid(), bu_id) 
  AND can_manage_team_okr(auth.uid(), team_id)
);

-- DELETE: apenas quem pode gerenciar o time do OKR
CREATE POLICY "okr_team_objectives_delete" 
ON public.okr_team_objectives 
FOR DELETE 
TO authenticated 
USING (
  is_bu_member(auth.uid(), bu_id) 
  AND can_manage_team_okr(auth.uid(), team_id)
);

-- 5) Índice para performance
CREATE INDEX IF NOT EXISTS idx_teams_leader_bu_active 
ON public.teams(leader_user_id, bu_id) 
WHERE deleted_at IS NULL AND status = 'active';

-- 6) Comentários de documentação
COMMENT ON FUNCTION public.get_okr_manageable_team_ids IS 
'Retorna IDs dos times que o usuário pode criar/gerenciar OKRs. Inclui time próprio (se líder) + todos descendentes. Admin tem acesso total.';

COMMENT ON FUNCTION public.can_manage_team_okr IS 
'Verifica se usuário pode criar/editar OKRs para um time específico. Usa get_okr_manageable_team_ids internamente.';

COMMENT ON FUNCTION public.get_descendant_team_ids IS 
'Retorna array de IDs do time + todos os seus descendentes na hierarquia (recursivo).';
