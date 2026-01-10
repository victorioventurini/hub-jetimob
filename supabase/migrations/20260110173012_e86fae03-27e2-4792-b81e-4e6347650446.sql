-- Fix handle_new_user to support pre-existing memberships (imported users)
-- Problem: 56 users have profile + membership created via import (user_id = NULL)
-- When they login via magic link, the INSERT fails due to unique constraint on is_default

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
  v_new_profile_id UUID;
BEGIN
  v_email := NEW.email;
  v_domain := lower(split_part(v_email, '@', 2));
  
  -- Get BU by email domain (this is the CORRECT BU for this user)
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
  
  -- Check if profile already exists for this email (pre-created via import/onboarding)
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE work_email = v_email AND user_id IS NULL;
  
  IF v_existing_profile_id IS NOT NULL THEN
    -- Update existing profile:
    -- 1. Link user_id
    -- 2. RESET onboarding_completed to FALSE (force user through onboarding)
    -- 3. Update bu_id to the CORRECT BU based on email domain
    UPDATE public.profiles
    SET user_id = NEW.id,
        onboarding_completed = false,  -- FORCE ONBOARDING for pre-existing profiles
        bu_id = v_bu_id,               -- FIX: Use correct BU from email domain
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
      COALESCE(NULLIF(v_last_name, ''), 'Jetimober'),
      v_display_name,
      v_email,
      'hybrid',
      'Porto Alegre',
      'RS',
      CURRENT_DATE,
      'active',
      v_bu_id,
      false  -- New users always start with onboarding not completed
    )
    RETURNING id INTO v_new_profile_id;
  END IF;
  
  -- Create default role (only if not exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'collaborator')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- FIX: Handle pre-existing memberships (imported users with user_id = NULL)
  -- First try to update existing membership for this profile
  UPDATE public.bu_user_memberships
  SET user_id = NEW.id,
      updated_at = NOW()
  WHERE profile_id = v_new_profile_id
    AND user_id IS NULL;
  
  -- If no existing membership was updated, create a new one
  IF NOT FOUND THEN
    INSERT INTO public.bu_user_memberships (user_id, profile_id, bu_id, role_in_bu, is_default)
    VALUES (NEW.id, v_new_profile_id, v_bu_id, 'collaborator', true)
    ON CONFLICT (user_id, bu_id) DO UPDATE SET
      profile_id = EXCLUDED.profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;