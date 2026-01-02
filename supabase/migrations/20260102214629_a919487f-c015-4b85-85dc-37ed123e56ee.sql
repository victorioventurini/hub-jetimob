-- ========================
-- BUSINESS UNITS MODULE
-- ========================

-- Enum for BU status
CREATE TYPE public.bu_status AS ENUM ('active', 'inactive');

-- Business Units table
CREATE TABLE public.bu_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  legal_entity TEXT,
  allowed_email_domains TEXT[] NOT NULL DEFAULT '{}',
  status public.bu_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User BU membership
CREATE TABLE public.bu_user_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  role_in_bu public.app_role NOT NULL DEFAULT 'collaborator',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bu_id)
);

-- Create index for fast domain lookups
CREATE INDEX idx_bu_units_domains ON public.bu_units USING GIN(allowed_email_domains);
CREATE INDEX idx_bu_user_memberships_user ON public.bu_user_memberships(user_id);
CREATE INDEX idx_bu_user_memberships_bu ON public.bu_user_memberships(bu_id);

-- Enable RLS
ALTER TABLE public.bu_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bu_user_memberships ENABLE ROW LEVEL SECURITY;

-- ========================
-- SECURITY DEFINER FUNCTIONS
-- ========================

-- Function to get BU by email domain
CREATE OR REPLACE FUNCTION public.get_bu_by_email_domain(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain TEXT;
  v_bu_id UUID;
BEGIN
  -- Extract domain from email
  v_domain := lower(split_part(p_email, '@', 2));
  
  -- Find BU with this domain
  SELECT id INTO v_bu_id
  FROM public.bu_units
  WHERE v_domain = ANY(allowed_email_domains)
    AND status = 'active'
  LIMIT 1;
  
  RETURN v_bu_id;
END;
$$;

-- Function to check if email domain is allowed
CREATE OR REPLACE FUNCTION public.is_email_domain_allowed(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_bu_by_email_domain(p_email) IS NOT NULL;
END;
$$;

-- Function to check if user has access to BU
CREATE OR REPLACE FUNCTION public.user_has_bu_access(p_user_id UUID, p_bu_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bu_user_memberships
    WHERE user_id = p_user_id
      AND bu_id = p_bu_id
  )
$$;

-- Function to get user's default BU
CREATE OR REPLACE FUNCTION public.get_user_default_bu(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu_id
  FROM public.bu_user_memberships
  WHERE user_id = p_user_id
    AND is_default = true
  LIMIT 1
$$;

-- Function to get user's BUs
CREATE OR REPLACE FUNCTION public.get_user_bus(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu_id
  FROM public.bu_user_memberships
  WHERE user_id = p_user_id
$$;

-- Function to check if user is BU admin
CREATE OR REPLACE FUNCTION public.is_bu_admin(p_user_id UUID, p_bu_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bu_user_memberships
    WHERE user_id = p_user_id
      AND bu_id = p_bu_id
      AND role_in_bu IN ('admin', 'ceo')
  )
$$;

-- ========================
-- RLS POLICIES FOR BU TABLES
-- ========================

-- bu_units policies
CREATE POLICY "Global admins can manage all BUs"
ON public.bu_units FOR ALL
USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "Users can view BUs they belong to"
ON public.bu_units FOR SELECT
USING (
  id IN (SELECT public.get_user_bus(auth.uid()))
  OR is_admin_or_ceo(auth.uid())
);

-- bu_user_memberships policies
CREATE POLICY "Global admins can manage all memberships"
ON public.bu_user_memberships FOR ALL
USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "BU admins can manage their BU memberships"
ON public.bu_user_memberships FOR ALL
USING (is_bu_admin(auth.uid(), bu_id));

CREATE POLICY "Users can view their own memberships"
ON public.bu_user_memberships FOR SELECT
USING (user_id = auth.uid());

-- ========================
-- ADD bu_id TO EXISTING TABLES
-- ========================

-- Add bu_id to teams
ALTER TABLE public.teams ADD COLUMN bu_id UUID REFERENCES public.bu_units(id);

-- Add bu_id to profiles
ALTER TABLE public.profiles ADD COLUMN bu_id UUID REFERENCES public.bu_units(id);

-- Add bu_id to OKR tables
ALTER TABLE public.okr_org_objectives ADD COLUMN bu_id UUID REFERENCES public.bu_units(id);
ALTER TABLE public.okr_team_objectives ADD COLUMN bu_id UUID REFERENCES public.bu_units(id);
ALTER TABLE public.okr_org_key_results ADD COLUMN bu_id UUID REFERENCES public.bu_units(id);
ALTER TABLE public.okr_team_key_results ADD COLUMN bu_id UUID REFERENCES public.bu_units(id);

-- Add bu_id and is_global to KPI tables
ALTER TABLE public.kpi_metrics ADD COLUMN bu_id UUID REFERENCES public.bu_units(id);
ALTER TABLE public.kpi_metrics ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for bu_id columns
CREATE INDEX idx_teams_bu ON public.teams(bu_id);
CREATE INDEX idx_profiles_bu ON public.profiles(bu_id);
CREATE INDEX idx_okr_org_objectives_bu ON public.okr_org_objectives(bu_id);
CREATE INDEX idx_okr_team_objectives_bu ON public.okr_team_objectives(bu_id);
CREATE INDEX idx_okr_org_key_results_bu ON public.okr_org_key_results(bu_id);
CREATE INDEX idx_okr_team_key_results_bu ON public.okr_team_key_results(bu_id);
CREATE INDEX idx_kpi_metrics_bu ON public.kpi_metrics(bu_id);

-- ========================
-- MIGRATION: CREATE DEFAULT BU AND ASSIGN DATA
-- ========================

-- Create default Jetimob BU
INSERT INTO public.bu_units (id, name, description, allowed_email_domains, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Jetimob',
  'Business Unit principal da Jetimob',
  ARRAY['jetimob.com'],
  'active'
);

-- Migrate existing teams to default BU
UPDATE public.teams SET bu_id = 'a0000000-0000-0000-0000-000000000001' WHERE bu_id IS NULL;

-- Migrate existing profiles to default BU (only @jetimob.com)
UPDATE public.profiles 
SET bu_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE bu_id IS NULL AND work_email LIKE '%@jetimob.com';

-- Migrate OKR data to default BU
UPDATE public.okr_org_objectives SET bu_id = 'a0000000-0000-0000-0000-000000000001' WHERE bu_id IS NULL;
UPDATE public.okr_team_objectives SET bu_id = 'a0000000-0000-0000-0000-000000000001' WHERE bu_id IS NULL;
UPDATE public.okr_org_key_results SET bu_id = 'a0000000-0000-0000-0000-000000000001' WHERE bu_id IS NULL;
UPDATE public.okr_team_key_results SET bu_id = 'a0000000-0000-0000-0000-000000000001' WHERE bu_id IS NULL;

-- Migrate KPI data to default BU
UPDATE public.kpi_metrics SET bu_id = 'a0000000-0000-0000-0000-000000000001' WHERE bu_id IS NULL;

-- Create memberships for existing users with @jetimob.com email
INSERT INTO public.bu_user_memberships (user_id, bu_id, role_in_bu, is_default)
SELECT 
  p.user_id,
  'a0000000-0000-0000-0000-000000000001',
  COALESCE(ur.role, 'collaborator'),
  true
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE p.user_id IS NOT NULL 
  AND p.work_email LIKE '%@jetimob.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.bu_user_memberships bum 
    WHERE bum.user_id = p.user_id 
      AND bum.bu_id = 'a0000000-0000-0000-0000-000000000001'
  );

-- ========================
-- UPDATE handle_new_user FUNCTION
-- ========================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_display_name TEXT;
  v_bu_id UUID;
  v_domain TEXT;
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
  
  -- Create profile with BU
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
  
  -- Create default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'collaborator');
  
  -- Create BU membership
  INSERT INTO public.bu_user_memberships (user_id, bu_id, role_in_bu, is_default)
  VALUES (NEW.id, v_bu_id, 'collaborator', true);
  
  RETURN NEW;
END;
$$;

-- ========================
-- TRIGGERS FOR UPDATED_AT
-- ========================

CREATE TRIGGER update_bu_units_updated_at
  BEFORE UPDATE ON public.bu_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bu_user_memberships_updated_at
  BEFORE UPDATE ON public.bu_user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();