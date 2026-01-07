-- Update handle_new_user trigger to handle pre-existing profiles (onboarding flow)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_display_name TEXT;
  v_bu_id UUID;
  v_domain TEXT;
  v_existing_profile_id UUID;
BEGIN
  v_email := NEW.email;
  v_domain := lower(split_part(v_email, '@', 2));
  
  -- Get BU by email domain
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
  
  -- Check if profile already exists for this email (pre-created via onboarding)
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE work_email = v_email AND user_id IS NULL;
  
  IF v_existing_profile_id IS NOT NULL THEN
    -- Update existing profile with user_id (linking the pre-created profile)
    UPDATE public.profiles
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE id = v_existing_profile_id;
  ELSE
    -- Create new profile
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      display_name,
      work_email,
      job_title,
      work_mode,
      city,
      state,
      start_date,
      employment_status,
      bu_id
    ) VALUES (
      NEW.id,
      v_first_name,
      COALESCE(NULLIF(v_last_name, ''), 'Jetimober'),
      v_display_name,
      v_email,
      'A definir',
      'hybrid',
      'Porto Alegre',
      'RS',
      CURRENT_DATE,
      'active',
      v_bu_id
    );
  END IF;
  
  -- Create default role (only if not exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'collaborator')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create BU membership (only if not exists)
  INSERT INTO public.bu_user_memberships (user_id, bu_id, role_in_bu, is_default)
  VALUES (NEW.id, v_bu_id, 'collaborator', true)
  ON CONFLICT (user_id, bu_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;