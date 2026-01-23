-- Fix: Restore correct INSERT policy for tickets table
-- Bug: Current policy uses is_current_bu(bu_id) but should validate created_by_user_id = my_profile_id()
-- This caused RLS violations when creating tickets because the policy was overly restrictive

-- Drop incorrect policy
DROP POLICY IF EXISTS "tickets_insert_policy" ON public.tickets;

-- Restore correct policy that validates:
-- 1. User has access to the BU (via auth.uid())
-- 2. The created_by_user_id matches the user's profile_id (security check)
CREATE POLICY "tickets_insert_policy" ON public.tickets
FOR INSERT TO public
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id)
  AND created_by_user_id = my_profile_id()
);

-- Also ensure the current_bu_id() function uses the correct column for lookups
-- The bu_user_memberships table has BOTH user_id (auth.uid) and profile_id (profiles.id)
-- The current implementation correctly uses user_id for auth.uid() lookups

COMMENT ON POLICY "tickets_insert_policy" ON public.tickets IS 
'Allows authenticated users to create tickets in BUs they have access to. Validates that created_by_user_id matches their profile_id.';