-- ============================================
-- Migration: Add field-level security for sensitive profile data
-- Purpose: Restrict WhatsApp, Instagram, Discord to own profile only
--          Keep birthdays visible to all BU members for internal communication
-- ============================================

-- 1. Create a secure function to get profile with conditional sensitive fields
-- This function masks sensitive contact fields unless viewing own profile
CREATE OR REPLACE FUNCTION get_profile_with_privacy(p_profile_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  work_email text,
  job_title_id uuid,
  photo_url text,
  city text,
  state text,
  work_mode text,
  employment_status text,
  start_date date,
  team_id uuid,
  bu_id uuid,
  manager_user_id uuid,
  -- Birthday fields: visible to all BU members (intentional for internal communication)
  birth_day integer,
  birth_month integer,
  -- Sensitive contact fields: only visible when viewing own profile
  whatsapp_personal text,
  instagram_id text,
  discord_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_profile_id uuid;
  v_is_own_profile boolean;
BEGIN
  -- Get the calling user's profile ID
  v_my_profile_id := my_profile_id();
  
  -- Check if viewing own profile
  v_is_own_profile := (p_profile_id = v_my_profile_id);
  
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.work_email,
    p.job_title_id,
    p.photo_url,
    p.city,
    p.state,
    p.work_mode::text,
    p.employment_status::text,
    p.start_date,
    p.team_id,
    p.bu_id,
    p.manager_user_id,
    -- Birthday: always visible (business decision for internal communication)
    p.birth_day,
    p.birth_month,
    -- Sensitive fields: only visible for own profile
    CASE WHEN v_is_own_profile THEN p.whatsapp_personal ELSE NULL END,
    CASE WHEN v_is_own_profile THEN p.instagram_id ELSE NULL END,
    CASE WHEN v_is_own_profile THEN p.discord_id ELSE NULL END
  FROM profiles p
  WHERE p.id = p_profile_id
    AND p.deleted_at IS NULL;
END;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_profile_with_privacy(uuid) TO authenticated;

-- 3. Add comment for documentation
COMMENT ON FUNCTION get_profile_with_privacy(uuid) IS 
'Returns profile data with field-level privacy controls.
Birthday data is visible to all BU members (for internal communication features).
Sensitive contact data (WhatsApp, Instagram, Discord) is only visible when viewing own profile.
This implements data minimization while preserving necessary functionality.';