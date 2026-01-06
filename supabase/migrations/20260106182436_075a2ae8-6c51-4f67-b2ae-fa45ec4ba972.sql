
-- =====================================================
-- Add RLS policies for BU admins to manage Teams, Squads, and Profiles
-- =====================================================

-- 1. Teams: Allow BU admins to manage teams in their BU
CREATE POLICY "BU admins can manage their BU teams"
ON public.teams
FOR ALL
USING (is_bu_admin(auth.uid(), bu_id))
WITH CHECK (is_bu_admin(auth.uid(), bu_id));

-- 2. Squads: Allow BU admins to manage squads in their BU
CREATE POLICY "BU admins can manage their BU squads"
ON public.squads
FOR ALL
USING (is_bu_admin(auth.uid(), bu_id))
WITH CHECK (is_bu_admin(auth.uid(), bu_id));

-- 3. Squad Memberships: Allow BU admins to manage squad memberships
CREATE POLICY "BU admins can manage squad memberships"
ON public.squad_memberships
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM squads s 
    WHERE s.id = squad_memberships.squad_id 
    AND is_bu_admin(auth.uid(), s.bu_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM squads s 
    WHERE s.id = squad_memberships.squad_id 
    AND is_bu_admin(auth.uid(), s.bu_id)
  )
);

-- 4. Squad Teams: Allow BU admins to manage squad-team relationships
CREATE POLICY "BU admins can manage squad teams"
ON public.squad_teams
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM squads s 
    WHERE s.id = squad_teams.squad_id 
    AND is_bu_admin(auth.uid(), s.bu_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM squads s 
    WHERE s.id = squad_teams.squad_id 
    AND is_bu_admin(auth.uid(), s.bu_id)
  )
);

-- 5. Profiles: Allow BU admins to update profiles in their BU
CREATE POLICY "BU admins can update profiles in their BU"
ON public.profiles
FOR UPDATE
USING (is_bu_admin(auth.uid(), bu_id))
WITH CHECK (is_bu_admin(auth.uid(), bu_id));

-- 6. Profiles: Allow BU admins to view all profiles (including inactive) in their BU for management
CREATE POLICY "BU admins can view all profiles in their BU"
ON public.profiles
FOR SELECT
USING (is_bu_admin(auth.uid(), bu_id));
