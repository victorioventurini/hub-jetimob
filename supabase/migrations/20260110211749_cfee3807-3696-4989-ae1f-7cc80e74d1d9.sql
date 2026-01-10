CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- First, check if this is an external user (partner contact)
  SELECT pc.id, pc.name, pc.bu_id, pc.partner_company_id
  INTO v_partner_contact
  FROM public.partner_contacts pc
  WHERE pc.email = v_email
    AND pc.status = 'active'
    AND pc.deleted_at IS NULL
  LIMIT 1;
  
  IF v_partner_contact IS NOT NULL THEN
    -- External user via partner_contacts
    v_is_external := true;
    v_bu_id := v_partner_contact.bu_id;
    
    -- Parse name from partner contact
    v_first_name := split_part(v_partner_contact.name, ' ', 1);
    v_last_name := CASE 
      WHEN position(' ' in v_partner_contact.name) > 0 
      THEN substring(v_partner_contact.name from position(' ' in v_partner_contact.name) + 1)
      ELSE ''
    END;
    v_display_name := v_partner_contact.name;
  ELSE
    -- Internal user - get BU by email domain
    v_bu_id := public.get_bu_by_email_domain(v_email);
    
    -- If no BU found for this domain, block user creation
    IF v_bu_id IS NULL THEN
      RAISE EXCEPTION 'Email domain not authorized for any Business Unit';
    END IF;
    
    -- Extract name from email
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
  
  -- Check if profile already exists for this email (pre-created via import/onboarding)
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE work_email = v_email AND user_id IS NULL;
  
  IF v_existing_profile_id IS NOT NULL THEN
    -- Update existing profile:
    -- 1. Link user_id
    -- 2. RESET onboarding_completed to FALSE (force user through onboarding)
    -- 3. Update bu_id to the CORRECT BU
    UPDATE public.profiles
    SET user_id = NEW.id,
        onboarding_completed = false,
        bu_id = v_bu_id,
        updated_at = NOW()
    WHERE id = v_existing_profile_id;
    
    v_new_profile_id := v_existing_profile_id;
  ELSE
    -- Create new profile
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
      v_bu_id,
      false
    )
    RETURNING id INTO v_new_profile_id;
  END IF;
  
  -- Create default role (collaborator for internal, external for partners)
  IF v_is_external THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'external')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'collaborator')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Create BU membership with BOTH user_id AND profile_id
  INSERT INTO public.bu_user_memberships (user_id, profile_id, bu_id, role_in_bu, is_default)
  VALUES (
    NEW.id, 
    v_new_profile_id, 
    v_bu_id, 
    CASE WHEN v_is_external THEN 'external' ELSE 'collaborator' END, 
    true
  )
  ON CONFLICT (user_id, bu_id) DO UPDATE SET
    profile_id = EXCLUDED.profile_id;
  
  -- Link partner contact to user_id (for future reference)
  IF v_is_external AND v_partner_contact IS NOT NULL THEN
    UPDATE public.partner_contacts
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE id = v_partner_contact.id;
  END IF;
  
  RETURN NEW;
END;
$function$;
