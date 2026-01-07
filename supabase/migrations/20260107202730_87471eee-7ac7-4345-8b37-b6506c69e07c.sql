-- Adicionar FKs explícitas para tabelas de OKR que estavam sem constraint
-- Isso garante integridade referencial e documenta o tipo de ID esperado

-- okr_initiatives.owner_user_id → profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'okr_initiatives_owner_user_id_fkey'
  ) THEN
    ALTER TABLE public.okr_initiatives
    ADD CONSTRAINT okr_initiatives_owner_user_id_fkey
    FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- okr_team_objectives.owner_user_id → profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'okr_team_objectives_owner_user_id_fkey'
  ) THEN
    ALTER TABLE public.okr_team_objectives
    ADD CONSTRAINT okr_team_objectives_owner_user_id_fkey
    FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- okr_team_key_results.owner_user_id → profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'okr_team_key_results_owner_user_id_fkey'
  ) THEN
    ALTER TABLE public.okr_team_key_results
    ADD CONSTRAINT okr_team_key_results_owner_user_id_fkey
    FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- okr_checkins.user_id → profiles.id (autor do check-in)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'okr_checkins_user_id_fkey'
  ) THEN
    ALTER TABLE public.okr_checkins
    ADD CONSTRAINT okr_checkins_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- Atualizar função get_manageable_teams para usar profile_id corretamente
CREATE OR REPLACE FUNCTION public.get_manageable_teams(
  p_user_id uuid DEFAULT NULL,
  p_bu_id uuid DEFAULT NULL
)
RETURNS TABLE(
  team_id uuid,
  team_name text,
  can_manage boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_bu_id uuid := COALESCE(p_bu_id, current_bu_id());
  v_profile_id uuid;
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL OR v_bu_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if user is admin (uses auth.users.id)
  v_is_admin := is_platform_admin(v_user_id) OR is_bu_admin(v_user_id, v_bu_id);
  
  -- Get profile_id from user_id (since team relations use profiles.id)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_profile_id IS NULL AND NOT v_is_admin THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id as team_id,
    t.name as team_name,
    CASE
      WHEN v_is_admin THEN true
      WHEN t.leader_user_id = v_profile_id THEN true
      ELSE false
    END as can_manage
  FROM teams t
  WHERE t.bu_id = v_bu_id
    AND t.deleted_at IS NULL
    AND t.status = 'active'
  ORDER BY t.name;
END;
$$;