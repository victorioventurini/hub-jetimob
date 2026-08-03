CREATE OR REPLACE FUNCTION public.get_profile_with_privacy(p_profile_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, first_name text, last_name text, display_name text, work_email text, job_title_id uuid, photo_url text, city text, state text, work_mode text, employment_status text, start_date date, team_id uuid, bu_id uuid, manager_user_id uuid, birth_day integer, birth_month integer, whatsapp_personal text, instagram_id text, discord_id text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_my_profile_id uuid;
  v_is_own_profile boolean;
  v_shares_bu boolean;
BEGIN
  v_my_profile_id := my_profile_id();
  v_is_own_profile := (p_profile_id = v_my_profile_id);

  -- Colleagues in the same BU can see the phone/WhatsApp (internal communication)
  SELECT EXISTS (
    SELECT 1
    FROM bu_user_memberships m1
    JOIN bu_user_memberships m2 ON m2.bu_id = m1.bu_id
    WHERE m1.profile_id = v_my_profile_id
      AND m1.deleted_at IS NULL
      AND m2.profile_id = p_profile_id
      AND m2.deleted_at IS NULL
  ) INTO v_shares_bu;

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
    p.birth_day,
    p.birth_month,
    CASE WHEN v_is_own_profile OR v_shares_bu THEN p.whatsapp_personal ELSE NULL END,
    CASE WHEN v_is_own_profile THEN p.instagram_id ELSE NULL END,
    CASE WHEN v_is_own_profile THEN p.discord_id ELSE NULL END
  FROM profiles p
  WHERE p.id = p_profile_id
    AND p.deleted_at IS NULL;
END;
$function$;