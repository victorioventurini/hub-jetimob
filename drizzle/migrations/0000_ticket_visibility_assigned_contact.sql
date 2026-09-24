CREATE OR REPLACE FUNCTION public.can_view_ticket(p_ticket_id uuid, p_profile_id uuid DEFAULT NULL::uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket RECORD; v_auth_uid uuid; v_partner_contact_id uuid; v_is_bu_member boolean := false;
  v_current_bu uuid; v_is_platform_admin boolean := false; v_company_scope_company_id uuid; v_scope_uid uuid;
BEGIN
  SELECT bu_id, visibility, visibility_team_ids, visibility_user_ids, created_by_user_id, owner_user_id,
         external_company_id, assigned_contact_id, external_assignee_contact_ids
  INTO v_ticket FROM public.tickets WHERE id = p_ticket_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;

  v_auth_uid := auth.uid();
  IF v_auth_uid IS NOT NULL THEN v_is_platform_admin := public.is_platform_admin(v_auth_uid); END IF;
  IF NOT v_is_platform_admin THEN
    BEGIN v_current_bu := public.current_bu_id(); EXCEPTION WHEN OTHERS THEN v_current_bu := NULL; END;
    IF v_current_bu IS NULL OR v_current_bu <> v_ticket.bu_id THEN RETURN false; END IF;
  END IF;

  IF p_profile_id IS NOT NULL THEN v_is_bu_member := is_profile_bu_member(p_profile_id, v_ticket.bu_id); END IF;

  IF p_profile_id IS NOT NULL AND v_is_bu_member THEN
    IF v_ticket.created_by_user_id = p_profile_id OR v_ticket.owner_user_id = p_profile_id THEN RETURN true; END IF;
  END IF;

  IF p_profile_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.ticket_participants tp WHERE tp.ticket_id = p_ticket_id
      AND tp.profile_id = p_profile_id AND tp.is_active = true) THEN RETURN true; END IF;
  END IF;

  IF p_profile_id IS NOT NULL THEN
    SELECT p.user_id INTO v_scope_uid FROM public.profiles p WHERE p.id = p_profile_id;
  END IF;

  -- CHECK 3: External contact (participant OR responsible contact), BU-associated
  SELECT pc.id INTO v_partner_contact_id
  FROM public.partner_contacts pc
  JOIN public.partner_contact_bu_associations pcba ON pcba.partner_contact_id = pc.id
    AND pcba.bu_id = v_ticket.bu_id AND pcba.is_active = true AND pcba.deleted_at IS NULL
  WHERE pc.status = 'active' AND pc.deleted_at IS NULL
    AND ((v_auth_uid IS NOT NULL AND pc.user_id = v_auth_uid) OR (v_scope_uid IS NOT NULL AND pc.user_id = v_scope_uid))
  LIMIT 1;

  IF v_partner_contact_id IS NOT NULL THEN
    IF v_ticket.assigned_contact_id = v_partner_contact_id
       OR v_partner_contact_id = ANY(COALESCE(v_ticket.external_assignee_contact_ids, '{}'::uuid[])) THEN
      RETURN true;
    END IF;
    IF EXISTS (SELECT 1 FROM public.ticket_participants tp WHERE tp.ticket_id = p_ticket_id
      AND tp.partner_contact_id = v_partner_contact_id AND tp.is_active = true) THEN RETURN true; END IF;
  END IF;

  -- CHECK 4: Profile-based user with partner_contact participation (legacy, no BU assoc)
  IF v_scope_uid IS NOT NULL THEN
    SELECT pc.id INTO v_partner_contact_id FROM public.partner_contacts pc
    WHERE pc.user_id = v_scope_uid AND pc.status = 'active' AND pc.deleted_at IS NULL LIMIT 1;
    IF v_partner_contact_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.ticket_participants tp
      WHERE tp.ticket_id = p_ticket_id AND tp.partner_contact_id = v_partner_contact_id AND tp.is_active = true) THEN
      RETURN true;
    END IF;
  END IF;

  -- CHECK 4b: company-wide visibility
  SELECT pc.external_company_id INTO v_company_scope_company_id
  FROM public.partner_contacts pc
  JOIN public.partner_contact_bu_associations pcba ON pcba.partner_contact_id = pc.id
    AND pcba.bu_id = v_ticket.bu_id AND pcba.is_active = true AND pcba.deleted_at IS NULL
  WHERE pc.can_view_company_tickets = true AND pc.status = 'active' AND pc.deleted_at IS NULL
    AND pc.external_company_id IS NOT NULL
    AND ((v_auth_uid IS NOT NULL AND pc.user_id = v_auth_uid) OR (v_scope_uid IS NOT NULL AND pc.user_id = v_scope_uid))
  LIMIT 1;
  IF v_company_scope_company_id IS NOT NULL THEN
    IF v_ticket.external_company_id = v_company_scope_company_id THEN RETURN true; END IF;
    IF EXISTS (SELECT 1 FROM public.ticket_participants tp JOIN public.partner_contacts pc2 ON pc2.id = tp.partner_contact_id
      WHERE tp.ticket_id = p_ticket_id AND tp.is_active = true AND pc2.external_company_id = v_company_scope_company_id) THEN
      RETURN true;
    END IF;
  END IF;

  IF v_is_bu_member THEN
    CASE v_ticket.visibility
      WHEN 'bu_all' THEN RETURN true;
      WHEN 'teams' THEN RETURN EXISTS (SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_profile_id AND utm.team_id = ANY(v_ticket.visibility_team_ids));
      WHEN 'users' THEN RETURN p_profile_id = ANY(v_ticket.visibility_user_ids);
      ELSE RETURN false;
    END CASE;
  END IF;
  RETURN false;
END;
$function$;

-- Prevent recurrence: link contact to an existing login (created before the contact) by email
CREATE OR REPLACE FUNCTION public.link_partner_contact_existing_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid;
BEGIN
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL AND NEW.deleted_at IS NULL THEN
    SELECT u.id INTO v_uid FROM auth.users u WHERE lower(u.email) = lower(NEW.email) LIMIT 1;
    IF v_uid IS NOT NULL THEN
      NEW.user_id := v_uid;
      NEW.profile_user_id := v_uid;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_link_partner_contact_existing_user ON public.partner_contacts;
CREATE TRIGGER trg_link_partner_contact_existing_user
BEFORE INSERT OR UPDATE OF email, user_id ON public.partner_contacts
FOR EACH ROW EXECUTE FUNCTION public.link_partner_contact_existing_user();