-- Step 1: Drop default constraints first
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.bu_user_memberships ALTER COLUMN role_in_bu DROP DEFAULT;

-- Step 2: Drop the has_role function that depends on app_role
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Step 3: Update user_roles table to use text temporarily
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE text USING role::text;

-- Step 4: Convert ceo to super_admin in user_roles
UPDATE public.user_roles SET role = 'super_admin' WHERE role = 'ceo';

-- Step 5: Update bu_user_memberships table to use text temporarily  
ALTER TABLE public.bu_user_memberships
  ALTER COLUMN role_in_bu TYPE text USING role_in_bu::text;

-- Step 6: Convert ceo to super_admin in bu_user_memberships
UPDATE public.bu_user_memberships SET role_in_bu = 'super_admin' WHERE role_in_bu = 'ceo';

-- Step 7: Drop the old enum type
DROP TYPE public.app_role;

-- Step 8: Create new enum with super_admin
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'team_leader', 'collaborator');

-- Step 9: Convert columns back to enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

ALTER TABLE public.bu_user_memberships
  ALTER COLUMN role_in_bu TYPE public.app_role USING role_in_bu::public.app_role;

-- Step 10: Set default values back
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'collaborator'::public.app_role;
ALTER TABLE public.bu_user_memberships ALTER COLUMN role_in_bu SET DEFAULT 'collaborator'::public.app_role;

-- Step 11: Recreate has_role function with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 12: Update the is_admin_or_ceo function to check super_admin and admin
CREATE OR REPLACE FUNCTION public.is_admin_or_ceo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin')
  )
$$;

-- Step 13: Create a new function specifically for super_admin check
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Step 14: Update victorio@jetimob.com to super_admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'victorio@jetimob.com'
);