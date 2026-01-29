
-- Delete orphan/duplicate membership (has user_id but no profile_id, and there's already one with profile_id)
DELETE FROM public.bu_user_memberships 
WHERE id = 'e317ac45-ba45-4507-a20c-c888a06c56af';

-- Update the correct membership to have user_id populated
UPDATE public.bu_user_memberships 
SET user_id = 'a761358c-d643-4b51-88b3-f730748e5dad'
WHERE id = 'e2f403d3-2468-4be4-9af6-25b19aa18512';

-- Ensure profile_id_from_user_id respects deleted_at (consistency fix)
CREATE OR REPLACE FUNCTION public.profile_id_from_user_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM profiles WHERE user_id = p_user_id AND deleted_at IS NULL LIMIT 1
$$;
