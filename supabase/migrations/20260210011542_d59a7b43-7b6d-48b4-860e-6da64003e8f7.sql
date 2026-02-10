CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_display_name TEXT;
  v_bu_id UUID;
  v_domain TEXT;
  v_existing_profile_id UUID;
  v_new_profile_id UUID;
  v_partner_contact RECORD;
  v_is_external BOOLEAN := false;
BEGIN
  v_email := lower(NEW.email);
  v_domain := split_part(v_email, '@', 2);

  PERFORM set_config('app.internal_call', 'true', true);
  
  -- Check if this is an external user (partner contact via BU association)
  SELECT pc.id, pc.name, pcba.bu_id, pc.external_company_id
  INTO v_partner_contact
  FROM public.partner_contacts pc
  JOIN public.partner_contact_bu_associations pcba ON pc.id = pcba.partner_contact_id
  WHERE pc.email = v_email
    AND pc.status = 'active'
    AND pc.deleted_at IS NULL
    AND pcba.is_active = true
    AND pcba.deleted_at IS NULL
  LIMIT 1;
  
  IF v_partner_contact IS NOT NULL THEN
    v_is_external := true;
    v_bu_id := v_partner_contact.bu_id;
    
    v_first_name := split_part(v_partner_contact.name, ' ', 1);
    v_last_name := CASE 
      WHEN position(' ' in v_partner_contact.name) > 0 
      THEN substring(v_partner_contact.name from position(' ' in v_partner_contact.name) + 1)
      ELSE ''
    END;
    v_display_name := v_partner_contact.name;
  ELSE
    v_bu_id := public.get_bu_by_email_domain(v_email);
    
    IF v_bu_id IS NULL THEN
      RAISE EXCEPTION 'Email domain not authorized for any Business Unit';
    END IF;
    
    v_first_name := COALESCE(
      NEW.raw_user_meta_data ->> 'first_name',
      split_part(split_part(v_email, '@', 1), '.', 1)
    );
    v_first_name := INITCAP(v_first_name);
    
    v_last_name := COALESCE(
      NEW.raw_user_meta_data ->> 'last_name',
      CASE 
        WHEN position('.' in split_part(v_email, '@', 1)) > 0 
        THEN split_part(split_part(v_email, '@', 1), '.', 2)
        ELSE ''
      END
    );
    v_last_name := INITCAP(v_last_name);
    
    v_display_name := TRIM(v_first_name || ' ' || v_last_name);
  END IF;
  
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE work_email = v_email AND user_id IS NULL;
  
  IF v_existing_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET user_id = NEW.id,
        onboarding_completed = false,
        bu_id = v_bu_id,
        user_type = CASE WHEN v_is_external THEN 'external' ELSE 'internal' END,
        updated_at = NOW()
    WHERE id = v_existing_profile_id;
    
    v_new_profile_id := v_existing_profile_id;
  ELSE
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      display_name,
      work_email,
      work_mode,
      city,
      state,
      start_date,
      employment_status,
      user_type,
      bu_id,
      onboarding_completed
    ) VALUES (
      NEW.id,
      v_first_name,
      COALESCE(NULLIF(v_last_name, ''), 'Parceiro'),
      v_display_name,
      v_email,
      'hybrid',
      'Porto Alegre',
      'RS',
      CURRENT_DATE,
      (CASE WHEN v_is_external THEN 'external' ELSE 'active' END)::employment_status,
      (CASE WHEN v_is_external THEN 'external' ELSE 'internal' END),
      v_bu_id,
      false
    )
    RETURNING id INTO v_new_profile_id;
  END IF;
  
  IF v_is_external THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'external'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'collaborator'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.bu_user_memberships (user_id, profile_id, bu_id, role_in_bu, is_default)
  VALUES (
    NEW.id,
    v_new_profile_id,
    v_bu_id,
    (CASE WHEN v_is_external THEN 'external' ELSE 'collaborator' END)::app_role,
    true
  )
  ON CONFLICT (profile_id) WHERE (is_default = true AND deleted_at IS NULL)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    bu_id = EXCLUDED.bu_id,
    role_in_bu = EXCLUDED.role_in_bu,
    is_default = true,
    updated_at = NOW();
  
  IF v_is_external AND v_partner_contact IS NOT NULL THEN
    UPDATE public.partner_contacts
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE id = v_partner_contact.id;
  END IF;
  
  RETURN NEW;
END;
$$;