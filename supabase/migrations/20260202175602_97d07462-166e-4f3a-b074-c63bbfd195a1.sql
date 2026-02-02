
-- ============================================================
-- FIX: RLS para okr_checkins INSERT
-- Garante que responsáveis (owner, co-responsável, líder do time) 
-- possam criar check-ins em suas KRs
-- ============================================================

-- Drop the existing policy
DROP POLICY IF EXISTS okr_checkins_insert_v2 ON public.okr_checkins;

-- Create new policy that properly validates ownership/responsibility
-- A user can create a checkin if:
-- 1. Has the base permission (okrs.checkin.create:self_or_owner)
-- 2. AND is related to the KR:
--    a. Is owner of the KR
--    b. Is co-responsible of the KR
--    c. Is a team leader (can manage team OKRs)
CREATE POLICY okr_checkins_insert_v3
ON public.okr_checkins
FOR INSERT
TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.checkin.create:self_or_owner')
  AND (
    -- Check relationship with the KR
    EXISTS (
      SELECT 1 FROM okr_team_key_results kr
      WHERE kr.id = okr_checkins.kr_id
      AND (
        -- Owner of the KR
        kr.owner_user_id = my_profile_id()
        -- Co-responsible of the KR
        OR my_profile_id() = ANY(kr.co_responsibles)
        -- Leader of the team (or parent team)
        OR can_manage_team_okr_by_profile(my_profile_id(), kr.team_id)
      )
    )
  )
);

-- Add comment for documentation
COMMENT ON POLICY okr_checkins_insert_v3 ON public.okr_checkins IS 
'Allows authenticated users to create check-ins only for KRs they own, co-own, or manage as team leader. Requires okrs.checkin.create:self_or_owner permission.';
