-- =============================================
-- HUB JETIMOB - DATABASE SCHEMA
-- =============================================

-- 1. ENUM TYPES
-- =============================================

-- Papéis globais do sistema
CREATE TYPE public.app_role AS ENUM ('ceo', 'admin', 'team_leader', 'collaborator');

-- Status de emprego
CREATE TYPE public.employment_status AS ENUM ('active', 'vacation', 'terminated');

-- Modo de trabalho
CREATE TYPE public.work_mode AS ENUM ('onsite', 'hybrid', 'remote');

-- Status de módulos
CREATE TYPE public.module_status AS ENUM ('active', 'inactive', 'coming_soon');

-- Status de saúde dos módulos
CREATE TYPE public.module_health AS ENUM ('healthy', 'degraded', 'down');

-- Status de times
CREATE TYPE public.team_status AS ENUM ('active', 'inactive');

-- =============================================
-- 2. PROFILES TABLE (USERS/JETIMOBERS)
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Campos obrigatórios (core)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  work_email TEXT NOT NULL UNIQUE,
  job_title TEXT NOT NULL,
  team_id UUID, -- FK será adicionada após criar teams
  manager_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  work_mode public.work_mode NOT NULL DEFAULT 'onsite',
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  start_date DATE NOT NULL,
  employment_status public.employment_status NOT NULL DEFAULT 'active',
  
  -- Campos opcionais
  photo_url TEXT,
  slack_id TEXT,
  work_phone TEXT,
  whatsapp_personal TEXT, -- Privado por padrão
  
  -- Campos de aniversário (sem ano!)
  birth_day INTEGER CHECK (birth_day >= 1 AND birth_day <= 31),
  birth_month INTEGER CHECK (birth_month >= 1 AND birth_month <= 12),
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- =============================================
-- 3. USER ROLES TABLE (Separada por segurança)
-- =============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'collaborator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- =============================================
-- 4. TEAMS TABLE (ESTRUTURA ORGANIZACIONAL)
-- =============================================

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  leader_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status public.team_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Adicionar FK de team_id em profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_team 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- =============================================
-- 5. MODULES TABLE (CATÁLOGO DE MÓDULOS)
-- =============================================

CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.module_status NOT NULL DEFAULT 'inactive',
  health_status public.module_health NOT NULL DEFAULT 'healthy',
  icon TEXT, -- Lucide icon name
  route TEXT, -- Rota no frontend
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 6. METRICS TABLE (MÉTRICAS OFICIAIS)
-- =============================================

CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  definition TEXT NOT NULL,
  formula TEXT,
  unit TEXT NOT NULL, -- ex: '%', 'R$', 'quantidade'
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source TEXT, -- ex: 'CRM', 'Financeiro', 'Marketing'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- =============================================
-- 7. CYCLES TABLE (CICLOS E RITMOS)
-- =============================================

CREATE TABLE public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- ex: 'Q1 2024', 'Ano Fiscal 2024'
  type TEXT NOT NULL, -- ex: 'quarter', 'year', 'sprint'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  planning_date DATE,
  review_date DATE,
  retro_date DATE,
  parent_cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 8. INTEGRATIONS TABLE
-- =============================================

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- ex: 'Slack', 'SendGrid', 'OpenAI'
  slug TEXT NOT NULL UNIQUE,
  status BOOLEAN NOT NULL DEFAULT false, -- ON/OFF
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scope TEXT, -- Escopo controlado
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 9. AUDIT LOGS TABLE (GOVERNANÇA)
-- =============================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- ex: 'login', 'create', 'update', 'delete'
  entity_type TEXT NOT NULL, -- ex: 'user', 'team', 'module'
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 10. TRIGGERS PARA UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cycles_updated_at
  BEFORE UPDATE ON public.cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 11. SECURITY DEFINER FUNCTIONS
-- =============================================

-- Função para verificar papel do usuário (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
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

-- Função para verificar se é admin ou CEO
CREATE OR REPLACE FUNCTION public.is_admin_or_ceo(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'ceo')
  )
$$;

-- Função para obter profile_id a partir do auth.uid()
CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- =============================================
-- 12. ROW LEVEL SECURITY
-- =============================================

-- Enable RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view active profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin_or_ceo(auth.uid()));

-- USER ROLES POLICIES
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin_or_ceo(auth.uid()));

-- TEAMS POLICIES
CREATE POLICY "Authenticated users can view active teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING (public.is_admin_or_ceo(auth.uid()));

-- MODULES POLICIES
CREATE POLICY "Authenticated users can view active modules"
  ON public.modules FOR SELECT
  TO authenticated
  USING (status != 'inactive');

CREATE POLICY "Admins can manage modules"
  ON public.modules FOR ALL
  TO authenticated
  USING (public.is_admin_or_ceo(auth.uid()));

-- METRICS POLICIES
CREATE POLICY "Authenticated users can view metrics"
  ON public.metrics FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage metrics"
  ON public.metrics FOR ALL
  TO authenticated
  USING (public.is_admin_or_ceo(auth.uid()));

-- CYCLES POLICIES
CREATE POLICY "Authenticated users can view cycles"
  ON public.cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cycles"
  ON public.cycles FOR ALL
  TO authenticated
  USING (public.is_admin_or_ceo(auth.uid()));

-- INTEGRATIONS POLICIES
CREATE POLICY "Authenticated users can view integrations"
  ON public.integrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage integrations"
  ON public.integrations FOR ALL
  TO authenticated
  USING (public.is_admin_or_ceo(auth.uid()));

-- AUDIT LOGS POLICIES (Somente leitura para admins)
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_or_ceo(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- 13. INDEXES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX idx_profiles_manager_user_id ON public.profiles(manager_user_id);
CREATE INDEX idx_profiles_employment_status ON public.profiles(employment_status);
CREATE INDEX idx_profiles_work_email ON public.profiles(work_email);
CREATE INDEX idx_profiles_birth_month ON public.profiles(birth_month);
CREATE INDEX idx_profiles_start_date ON public.profiles(start_date);

CREATE INDEX idx_teams_parent_team_id ON public.teams(parent_team_id);
CREATE INDEX idx_teams_leader_user_id ON public.teams(leader_user_id);
CREATE INDEX idx_teams_status ON public.teams(status);

CREATE INDEX idx_modules_slug ON public.modules(slug);
CREATE INDEX idx_modules_status ON public.modules(status);

CREATE INDEX idx_cycles_type ON public.cycles(type);
CREATE INDEX idx_cycles_dates ON public.cycles(start_date, end_date);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);