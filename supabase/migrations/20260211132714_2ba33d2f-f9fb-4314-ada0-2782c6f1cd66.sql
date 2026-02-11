
-- 1. Trigger on profiles: auto-assign manager from team leader
CREATE OR REPLACE FUNCTION public.sync_manager_from_team_leader()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only act when team_id changes (or is set for the first time)
  IF (TG_OP = 'INSERT' AND NEW.team_id IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.team_id IS DISTINCT FROM OLD.team_id AND NEW.team_id IS NOT NULL)
  THEN
    -- Only fill if manager_user_id is NULL (respect manual assignments)
    IF NEW.manager_user_id IS NULL THEN
      SELECT t.leader_user_id INTO NEW.manager_user_id
      FROM teams t
      WHERE t.id = NEW.team_id
        AND t.leader_user_id IS NOT NULL
        AND t.leader_user_id <> NEW.id;  -- leader is not their own manager
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_manager_from_team_leader
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_manager_from_team_leader();

-- 2. Trigger on teams: propagate leader change to members
CREATE OR REPLACE FUNCTION public.propagate_leader_change_to_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only act when leader_user_id changes
  IF NEW.leader_user_id IS DISTINCT FROM OLD.leader_user_id THEN
    UPDATE profiles
    SET manager_user_id = NEW.leader_user_id
    WHERE team_id = NEW.id
      AND (
        -- Members whose manager was the OLD leader (swap to new)
        (OLD.leader_user_id IS NOT NULL AND manager_user_id = OLD.leader_user_id)
        -- Or members with no manager at all
        OR manager_user_id IS NULL
      )
      -- Don't assign the new leader as their own manager
      AND id <> COALESCE(NEW.leader_user_id, '00000000-0000-0000-0000-000000000000')
      AND employment_status <> 'terminated'
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_propagate_leader_change_to_members
  AFTER UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_leader_change_to_members();

-- 3. One-time fix: assign manager for existing profiles missing it
UPDATE profiles p
SET manager_user_id = t.leader_user_id
FROM teams t
WHERE p.team_id = t.id
  AND p.manager_user_id IS NULL
  AND t.leader_user_id IS NOT NULL
  AND p.id <> t.leader_user_id
  AND p.employment_status <> 'terminated'
  AND p.deleted_at IS NULL;
