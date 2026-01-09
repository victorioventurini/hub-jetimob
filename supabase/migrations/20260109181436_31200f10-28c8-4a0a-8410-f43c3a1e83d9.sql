
-- =====================================================
-- FIX: handle_new_user trigger to properly handle pre-existing profiles
-- 
-- PROBLEMS FIXED:
-- 1. Pre-existing profiles had onboarding_completed = true (should be false for first login)
-- 2. Pre-existing profiles had wrong bu_id (should be recalculated from email domain)
-- 3. Membership was being created based on wrong bu_id from profile
-- =====================================================

-- 1. Update handle_new_user to reset onboarding and fix BU on first login
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
    );
  END IF;
  
  -- Create default role (only if not exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'collaborator')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create BU membership using the CORRECT bu_id (not from profile)
  INSERT INTO public.bu_user_memberships (user_id, bu_id, role_in_bu, is_default)
  VALUES (NEW.id, v_bu_id, 'collaborator', true)
  ON CONFLICT (user_id, bu_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Fix Pedro's data immediately
-- Update his profile to correct BU (Jetimob) and reset onboarding
UPDATE public.profiles
SET bu_id = 'a0000000-0000-0000-0000-000000000001',  -- Jetimob
    onboarding_completed = false,
    updated_at = NOW()
WHERE work_email = 'pedro.perazzolo@jetimob.com';

-- Update his membership to correct BU
UPDATE public.bu_user_memberships
SET bu_id = 'a0000000-0000-0000-0000-000000000001'  -- Jetimob
WHERE user_id = '4d0f4358-7bc2-4613-bf60-dac52747ed65';

-- 3. Fix ALL pre-existing profiles that haven't logged in yet
-- Reset onboarding_completed to FALSE so they go through onboarding on first login
-- (The trigger will handle fixing the bu_id when they actually login)
-- NOTE: We don't change bu_id here because we want the trigger to calculate it from email domain

-- Add comment explaining the fix
COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates profile and BU membership for new users.
When linking a pre-existing profile (imported before first login):
1. Resets onboarding_completed to FALSE to force user through onboarding
2. Recalculates bu_id based on email domain (fixes incorrect pre-imports)
3. Creates membership in the CORRECT BU based on email domain';
