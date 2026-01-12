
-- Add policy to allow BU members to view other members in same BU (for home cards: birthdays, anniversaries, new jetimobers)
-- This is a SELECT-only policy - users can only VIEW, not modify other memberships

CREATE POLICY "bu_user_memberships_select_same_bu_v2"
ON public.bu_user_memberships
FOR SELECT
TO authenticated
USING (
  -- User can see memberships of their own BU
  is_profile_bu_member(my_profile_id(), bu_id)
);

COMMENT ON POLICY "bu_user_memberships_select_same_bu_v2" ON public.bu_user_memberships IS 
'Allows authenticated users to view memberships within their own BU. Required for home cards (birthdays, anniversaries, new jetimobers).';
