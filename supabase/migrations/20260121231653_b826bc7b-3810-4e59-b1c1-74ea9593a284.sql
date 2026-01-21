-- Complete the rename: drop and recreate remaining function

-- Drop impersonation function before recreating
DROP FUNCTION IF EXISTS public.get_visible_ticket_ids_for_impersonation(uuid);

-- Recreate with profile_id reference
CREATE FUNCTION public.get_visible_ticket_ids_for_impersonation(p_profile_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result uuid[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT t.id) INTO v_result FROM public.tickets t
  WHERE t.deleted_at IS NULL AND (
    t.created_by_user_id = p_profile_id OR t.owner_user_id = p_profile_id
    OR EXISTS (SELECT 1 FROM public.ticket_participants tp WHERE tp.ticket_id = t.id AND tp.profile_id = p_profile_id AND tp.is_active = true)
    OR (t.visibility = 'all' AND is_profile_bu_member(p_profile_id, t.bu_id))
    OR (t.visibility = 'teams' AND EXISTS (SELECT 1 FROM public.user_team_memberships utm WHERE utm.user_id = p_profile_id AND utm.team_id = ANY(t.visibility_team_ids) AND utm.is_active = true))
    OR (t.visibility = 'squads' AND EXISTS (SELECT 1 FROM public.squad_memberships sm WHERE sm.user_id = p_profile_id AND sm.squad_id = ANY(t.visibility_squad_ids) AND sm.is_active = true))
    OR (t.visibility = 'users' AND p_profile_id = ANY(t.visibility_user_ids))
  );
  RETURN COALESCE(v_result, ARRAY[]::uuid[]);
END;
$$;