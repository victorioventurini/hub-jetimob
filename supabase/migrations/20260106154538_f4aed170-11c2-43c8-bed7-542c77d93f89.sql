-- ===============================
-- SISTEMA DE PERMISSÕES RBAC + ESCOPO
-- ===============================

-- 1) ENUM para scopes de permissão
CREATE TYPE public.permission_scope AS ENUM (
  'self',
  'self_or_owner',
  'team',
  'team_tree',
  'squad',
  'bu',
  'global',
  'public'
);

-- 2) ENUM para status de registros
CREATE TYPE public.catalog_status AS ENUM ('active', 'inactive');

-- 3) ENUM para efeito de override
CREATE TYPE public.permission_effect AS ENUM ('allow', 'deny');

-- ===============================
-- TABELAS GLOBAIS
-- ===============================

-- 4) permission_catalog (GLOBAL) - Catálogo único de permissões
CREATE TABLE public.permission_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  scope public.permission_scope NOT NULL,
  description TEXT,
  status public.catalog_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_permission_catalog_module ON public.permission_catalog(module);
CREATE INDEX idx_permission_catalog_status ON public.permission_catalog(status);
CREATE INDEX idx_permission_catalog_key ON public.permission_catalog(key);

-- Trigger para updated_at
CREATE TRIGGER update_permission_catalog_updated_at
  BEFORE UPDATE ON public.permission_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5) permission_groups (GLOBAL) - Grupos de permissões
CREATE TABLE public.permission_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status public.catalog_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_permission_groups_status ON public.permission_groups(status);

CREATE TRIGGER update_permission_groups_updated_at
  BEFORE UPDATE ON public.permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6) permission_group_permissions (GLOBAL) - Permissões dentro de cada grupo
CREATE TABLE public.permission_group_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permission_catalog(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, permission_id)
);

CREATE INDEX idx_pgp_group_id ON public.permission_group_permissions(group_id);
CREATE INDEX idx_pgp_permission_id ON public.permission_group_permissions(permission_id);

-- ===============================
-- TABELAS POR BU
-- ===============================

-- 7) bu_permission_group_configs (POR BU) - Habilita/desabilita grupos na BU
CREATE TABLE public.bu_permission_group_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bu_id, group_id)
);

CREATE INDEX idx_bpgc_bu_id ON public.bu_permission_group_configs(bu_id);
CREATE INDEX idx_bpgc_group_id ON public.bu_permission_group_configs(group_id);

CREATE TRIGGER update_bu_permission_group_configs_updated_at
  BEFORE UPDATE ON public.bu_permission_group_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8) bu_user_permission_groups (POR BU) - Atribuição de grupos ao usuário na BU
CREATE TABLE public.bu_user_permission_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bu_id, user_id, group_id)
);

CREATE INDEX idx_bupg_bu_id ON public.bu_user_permission_groups(bu_id);
CREATE INDEX idx_bupg_user_id ON public.bu_user_permission_groups(user_id);
CREATE INDEX idx_bupg_group_id ON public.bu_user_permission_groups(group_id);

-- 9) bu_user_permission_overrides (POR BU) - Overrides individuais
CREATE TABLE public.bu_user_permission_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permission_catalog(id) ON DELETE CASCADE,
  effect public.permission_effect NOT NULL DEFAULT 'allow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bu_id, user_id, permission_id)
);

CREATE INDEX idx_bupo_bu_id ON public.bu_user_permission_overrides(bu_id);
CREATE INDEX idx_bupo_user_id ON public.bu_user_permission_overrides(user_id);
CREATE INDEX idx_bupo_permission_id ON public.bu_user_permission_overrides(permission_id);

-- ===============================
-- FUNÇÕES DE CHECAGEM DE PERMISSÕES
-- ===============================

-- 10) Função auxiliar: is_super_admin (apenas super_admin, não admin global)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- 11) Função principal: user_has_permission (sem contexto)
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id uuid,
  p_bu_id uuid,
  p_permission_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_permission_id uuid;
BEGIN
  -- 1) Super admin tem acesso total
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- 2) BU admin tem acesso amplo na BU
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;

  -- 3) Buscar permission_id pela key
  SELECT id INTO v_permission_id
  FROM public.permission_catalog
  WHERE key = p_permission_key
    AND status = 'active';

  IF v_permission_id IS NULL THEN
    RETURN false;
  END IF;

  -- 4) Verificar override allow individual
  IF EXISTS (
    SELECT 1
    FROM public.bu_user_permission_overrides o
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.permission_id = v_permission_id
      AND o.effect = 'allow'
  ) THEN
    RETURN true;
  END IF;

  -- 5) Verificar via grupos atribuídos e habilitados na BU
  IF EXISTS (
    SELECT 1
    FROM public.bu_user_permission_groups upg
    JOIN public.bu_permission_group_configs pgc
      ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
    JOIN public.permission_group_permissions pgp
      ON pgp.group_id = upg.group_id
    WHERE upg.user_id = p_user_id
      AND upg.bu_id = p_bu_id
      AND pgc.is_enabled = true
      AND pgp.permission_id = v_permission_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 12) Função com contexto: user_has_permission_ctx (para validação de escopo)
CREATE OR REPLACE FUNCTION public.user_has_permission_ctx(
  p_user_id uuid,
  p_bu_id uuid,
  p_permission_key text,
  p_ctx jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_permission_id uuid;
  v_scope public.permission_scope;
  v_owner_user_id uuid;
  v_target_user_id uuid;
  v_team_id uuid;
  v_contributors uuid[];
  v_has_base_permission boolean := false;
BEGIN
  -- 1) Super admin tem acesso total
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- 2) BU admin tem acesso amplo na BU
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;

  -- 3) Buscar permission_id e scope
  SELECT id, scope INTO v_permission_id, v_scope
  FROM public.permission_catalog
  WHERE key = p_permission_key
    AND status = 'active';

  IF v_permission_id IS NULL THEN
    RETURN false;
  END IF;

  -- 4) Verificar override allow individual
  IF EXISTS (
    SELECT 1
    FROM public.bu_user_permission_overrides o
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.permission_id = v_permission_id
      AND o.effect = 'allow'
  ) THEN
    v_has_base_permission := true;
  END IF;

  -- 5) Verificar via grupos
  IF NOT v_has_base_permission AND NOT EXISTS (
    SELECT 1
    FROM public.bu_user_permission_groups upg
    JOIN public.bu_permission_group_configs pgc
      ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
    JOIN public.permission_group_permissions pgp
      ON pgp.group_id = upg.group_id
    WHERE upg.user_id = p_user_id
      AND upg.bu_id = p_bu_id
      AND pgc.is_enabled = true
      AND pgp.permission_id = v_permission_id
  ) THEN
    RETURN false;
  END IF;

  -- 6) Validar escopo baseado no contexto
  CASE v_scope
    WHEN 'global' THEN
      RETURN true;
    
    WHEN 'public' THEN
      RETURN true;
    
    WHEN 'bu' THEN
      RETURN true;
    
    WHEN 'self' THEN
      v_target_user_id := (p_ctx->>'target_user_id')::uuid;
      RETURN v_target_user_id IS NOT NULL AND v_target_user_id = p_user_id;
    
    WHEN 'self_or_owner' THEN
      v_owner_user_id := (p_ctx->>'owner_user_id')::uuid;
      v_contributors := ARRAY(SELECT jsonb_array_elements_text(p_ctx->'contributors')::uuid);
      RETURN (v_owner_user_id IS NOT NULL AND v_owner_user_id = p_user_id)
          OR (p_user_id = ANY(v_contributors));
    
    WHEN 'team' THEN
      v_team_id := (p_ctx->>'team_id')::uuid;
      IF v_team_id IS NULL THEN RETURN false; END IF;
      RETURN EXISTS (
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND utm.team_id = v_team_id
          AND utm.is_active = true
      );
    
    WHEN 'team_tree' THEN
      v_team_id := (p_ctx->>'team_id')::uuid;
      IF v_team_id IS NULL THEN RETURN false; END IF;
      RETURN EXISTS (
        WITH RECURSIVE team_hierarchy AS (
          SELECT id, parent_team_id FROM public.teams WHERE id = v_team_id AND bu_id = p_bu_id
          UNION ALL
          SELECT t.id, t.parent_team_id FROM public.teams t
          INNER JOIN team_hierarchy th ON t.parent_team_id = th.id
        )
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND utm.team_id IN (SELECT id FROM team_hierarchy)
          AND utm.is_active = true
      );
    
    WHEN 'squad' THEN
      RETURN false;
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- 13) View para permissões efetivas do usuário em uma BU
CREATE OR REPLACE VIEW public.user_effective_permissions AS
SELECT DISTINCT
  upg.user_id,
  upg.bu_id,
  pc.id AS permission_id,
  pc.key AS permission_key,
  pc.module,
  pc.resource,
  pc.action,
  pc.scope::text,
  'group' AS source,
  pg.name AS source_name
FROM public.bu_user_permission_groups upg
JOIN public.bu_permission_group_configs pgc
  ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
JOIN public.permission_groups pg
  ON pg.id = upg.group_id AND pg.status = 'active'
JOIN public.permission_group_permissions pgp
  ON pgp.group_id = upg.group_id
JOIN public.permission_catalog pc
  ON pc.id = pgp.permission_id AND pc.status = 'active'
WHERE pgc.is_enabled = true

UNION

SELECT DISTINCT
  o.user_id,
  o.bu_id,
  pc.id AS permission_id,
  pc.key AS permission_key,
  pc.module,
  pc.resource,
  pc.action,
  pc.scope::text,
  'override' AS source,
  'Permissão Individual' AS source_name
FROM public.bu_user_permission_overrides o
JOIN public.permission_catalog pc
  ON pc.id = o.permission_id AND pc.status = 'active'
WHERE o.effect = 'allow';

-- ===============================
-- RLS POLICIES
-- ===============================

-- permission_catalog: somente super_admin pode CRUD
ALTER TABLE public.permission_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage permission catalog"
  ON public.permission_catalog FOR ALL
  USING (is_super_admin(auth.uid()));

-- permission_groups: somente super_admin pode CRUD
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage permission groups"
  ON public.permission_groups FOR ALL
  USING (is_super_admin(auth.uid()));

-- permission_group_permissions: somente super_admin pode CRUD
ALTER TABLE public.permission_group_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage group permissions"
  ON public.permission_group_permissions FOR ALL
  USING (is_super_admin(auth.uid()));

-- bu_permission_group_configs: platform admin total, bu admin na própria BU
ALTER TABLE public.bu_permission_group_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all BU group configs"
  ON public.bu_permission_group_configs FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "BU admins can manage their BU group configs"
  ON public.bu_permission_group_configs FOR ALL
  USING (is_bu_admin(auth.uid(), bu_id));

CREATE POLICY "Users can view their BU group configs"
  ON public.bu_permission_group_configs FOR SELECT
  USING (user_has_bu_access(auth.uid(), bu_id));

-- bu_user_permission_groups: platform admin total, bu admin na própria BU, user lê próprios
ALTER TABLE public.bu_user_permission_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all user groups"
  ON public.bu_user_permission_groups FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "BU admins can manage user groups in their BU"
  ON public.bu_user_permission_groups FOR ALL
  USING (is_bu_admin(auth.uid(), bu_id));

CREATE POLICY "Users can view their own groups"
  ON public.bu_user_permission_groups FOR SELECT
  USING (user_id = auth.uid());

-- bu_user_permission_overrides: platform admin total, bu admin na própria BU, user lê próprios
ALTER TABLE public.bu_user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all overrides"
  ON public.bu_user_permission_overrides FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "BU admins can manage overrides in their BU"
  ON public.bu_user_permission_overrides FOR ALL
  USING (is_bu_admin(auth.uid(), bu_id));

CREATE POLICY "Users can view their own overrides"
  ON public.bu_user_permission_overrides FOR SELECT
  USING (user_id = auth.uid());

-- ===============================
-- SEEDS INICIAIS
-- ===============================

-- Permissões do módulo OKRs
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description) VALUES
-- OKRs - Objetivos Organizacionais
('okrs.org_objective.read:bu', 'okrs', 'org_objective', 'read', 'bu', 'Visualizar objetivos organizacionais'),
('okrs.org_objective.create:bu', 'okrs', 'org_objective', 'create', 'bu', 'Criar objetivos organizacionais'),
('okrs.org_objective.update:self_or_owner', 'okrs', 'org_objective', 'update', 'self_or_owner', 'Editar objetivos organizacionais próprios'),
('okrs.org_objective.delete:bu', 'okrs', 'org_objective', 'delete', 'bu', 'Excluir objetivos organizacionais'),

-- OKRs - KRs Organizacionais
('okrs.org_kr.read:bu', 'okrs', 'org_kr', 'read', 'bu', 'Visualizar KRs organizacionais'),
('okrs.org_kr.create:bu', 'okrs', 'org_kr', 'create', 'bu', 'Criar KRs organizacionais'),
('okrs.org_kr.update:self_or_owner', 'okrs', 'org_kr', 'update', 'self_or_owner', 'Editar KRs organizacionais próprios'),
('okrs.org_kr.delete:bu', 'okrs', 'org_kr', 'delete', 'bu', 'Excluir KRs organizacionais'),

-- OKRs - Objetivos de Time
('okrs.team_objective.read:team_tree', 'okrs', 'team_objective', 'read', 'team_tree', 'Visualizar objetivos do time'),
('okrs.team_objective.create:team', 'okrs', 'team_objective', 'create', 'team', 'Criar objetivos do time'),
('okrs.team_objective.update:self_or_owner', 'okrs', 'team_objective', 'update', 'self_or_owner', 'Editar objetivos do time próprios'),
('okrs.team_objective.delete:team', 'okrs', 'team_objective', 'delete', 'team', 'Excluir objetivos do time'),

-- OKRs - KRs de Time
('okrs.team_kr.read:team_tree', 'okrs', 'team_kr', 'read', 'team_tree', 'Visualizar KRs do time'),
('okrs.team_kr.create:team', 'okrs', 'team_kr', 'create', 'team', 'Criar KRs do time'),
('okrs.team_kr.update:self_or_owner', 'okrs', 'team_kr', 'update', 'self_or_owner', 'Editar KRs do time próprios'),
('okrs.team_kr.delete:team', 'okrs', 'team_kr', 'delete', 'team', 'Excluir KRs do time'),

-- OKRs - Check-ins
('okrs.checkin.read:team_tree', 'okrs', 'checkin', 'read', 'team_tree', 'Visualizar check-ins'),
('okrs.checkin.create:self_or_owner', 'okrs', 'checkin', 'create', 'self_or_owner', 'Criar check-ins'),
('okrs.checkin.update:self', 'okrs', 'checkin', 'update', 'self', 'Editar check-ins próprios'),

-- OKRs - Iniciativas
('okrs.initiative.read:team_tree', 'okrs', 'initiative', 'read', 'team_tree', 'Visualizar iniciativas'),
('okrs.initiative.create:team', 'okrs', 'initiative', 'create', 'team', 'Criar iniciativas'),
('okrs.initiative.update:self_or_owner', 'okrs', 'initiative', 'update', 'self_or_owner', 'Editar iniciativas próprias'),
('okrs.initiative.delete:self_or_owner', 'okrs', 'initiative', 'delete', 'self_or_owner', 'Excluir iniciativas próprias'),

-- OKRs - Ciclos (configuração)
('okrs.cycle.read:bu', 'okrs', 'cycle', 'read', 'bu', 'Visualizar ciclos'),
('okrs.cycle.manage:bu', 'okrs', 'cycle', 'manage', 'bu', 'Gerenciar ciclos'),

-- KPIs
('kpis.metric.read:bu', 'kpis', 'metric', 'read', 'bu', 'Visualizar métricas'),
('kpis.metric.create:bu', 'kpis', 'metric', 'create', 'bu', 'Criar métricas'),
('kpis.metric.update:self_or_owner', 'kpis', 'metric', 'update', 'self_or_owner', 'Editar métricas próprias'),
('kpis.metric.delete:bu', 'kpis', 'metric', 'delete', 'bu', 'Excluir métricas'),
('kpis.value.read:bu', 'kpis', 'value', 'read', 'bu', 'Visualizar valores de KPIs'),
('kpis.value.create:bu', 'kpis', 'value', 'create', 'bu', 'Registrar valores de KPIs'),

-- Assets - Inventário
('assets.inventory.read:bu', 'assets', 'inventory', 'read', 'bu', 'Visualizar inventário'),
('assets.inventory.create:bu', 'assets', 'inventory', 'create', 'bu', 'Criar itens de inventário'),
('assets.inventory.update:bu', 'assets', 'inventory', 'update', 'bu', 'Editar itens de inventário'),
('assets.inventory.delete:bu', 'assets', 'inventory', 'delete', 'bu', 'Excluir itens de inventário'),
('assets.inventory.movement.create:bu', 'assets', 'inventory_movement', 'create', 'bu', 'Registrar movimentação de inventário'),

-- Assets - Chaves
('assets.keys.read:bu', 'assets', 'keys', 'read', 'bu', 'Visualizar chaves'),
('assets.keys.create:bu', 'assets', 'keys', 'create', 'bu', 'Criar chaves'),
('assets.keys.update:bu', 'assets', 'keys', 'update', 'bu', 'Editar chaves'),
('assets.keys.delete:bu', 'assets', 'keys', 'delete', 'bu', 'Excluir chaves'),
('assets.keys.checkout:bu', 'assets', 'keys', 'checkout', 'bu', 'Retirar/devolver chaves'),

-- Assets - Brindes
('assets.gifts.read:bu', 'assets', 'gifts', 'read', 'bu', 'Visualizar brindes'),
('assets.gifts.create:bu', 'assets', 'gifts', 'create', 'bu', 'Criar brindes'),
('assets.gifts.update:bu', 'assets', 'gifts', 'update', 'bu', 'Editar brindes'),
('assets.gifts.delete:bu', 'assets', 'gifts', 'delete', 'bu', 'Excluir brindes'),
('assets.gifts.movement.create:bu', 'assets', 'gifts_movement', 'create', 'bu', 'Registrar movimentação de brindes'),

-- Teams
('teams.team.read:bu', 'teams', 'team', 'read', 'bu', 'Visualizar times'),
('teams.team.create:bu', 'teams', 'team', 'create', 'bu', 'Criar times'),
('teams.team.update:bu', 'teams', 'team', 'update', 'bu', 'Editar times'),
('teams.team.delete:bu', 'teams', 'team', 'delete', 'bu', 'Excluir times'),
('teams.squad.read:bu', 'teams', 'squad', 'read', 'bu', 'Visualizar squads'),
('teams.squad.create:bu', 'teams', 'squad', 'create', 'bu', 'Criar squads'),
('teams.squad.update:bu', 'teams', 'squad', 'update', 'bu', 'Editar squads'),
('teams.squad.delete:bu', 'teams', 'squad', 'delete', 'bu', 'Excluir squads'),

-- Users/Profiles
('users.profile.read:bu', 'users', 'profile', 'read', 'bu', 'Visualizar perfis'),
('users.profile.update:self', 'users', 'profile', 'update', 'self', 'Editar próprio perfil'),
('users.profile.manage:bu', 'users', 'profile', 'manage', 'bu', 'Gerenciar perfis da BU'),

-- Tickets
('tickets.thread.read:bu', 'tickets', 'thread', 'read', 'bu', 'Visualizar tickets'),
('tickets.thread.create:bu', 'tickets', 'thread', 'create', 'bu', 'Criar tickets'),
('tickets.thread.update:self_or_owner', 'tickets', 'thread', 'update', 'self_or_owner', 'Editar tickets próprios'),
('tickets.message.create:bu', 'tickets', 'message', 'create', 'bu', 'Enviar mensagens em tickets');

-- Grupos de permissões padrão
INSERT INTO public.permission_groups (name, description) VALUES
('Viewer', 'Acesso somente leitura a todos os módulos'),
('Colaborador', 'Acesso padrão para colaboradores'),
('Líder de Time', 'Permissões ampliadas para líderes de time'),
('Assets Keys Manager', 'Gerenciador de chaves no módulo Assets'),
('Assets Inventory Manager', 'Gerenciador de inventário no módulo Assets'),
('Assets Gifts Manager', 'Gerenciador de brindes no módulo Assets');

-- Permissões do grupo Viewer (leitura)
INSERT INTO public.permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM public.permission_groups pg, public.permission_catalog pc
WHERE pg.name = 'Viewer'
  AND pc.action = 'read';

-- Permissões do grupo Colaborador (leitura + criar check-ins/iniciativas)
INSERT INTO public.permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM public.permission_groups pg, public.permission_catalog pc
WHERE pg.name = 'Colaborador'
  AND (pc.action = 'read' 
    OR pc.key IN (
      'okrs.checkin.create:self_or_owner',
      'okrs.initiative.create:team',
      'okrs.initiative.update:self_or_owner',
      'users.profile.update:self',
      'tickets.thread.create:bu',
      'tickets.message.create:bu'
    ));

-- Permissões do grupo Líder de Time (colaborador + gestão de OKRs/KPIs do time)
INSERT INTO public.permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM public.permission_groups pg, public.permission_catalog pc
WHERE pg.name = 'Líder de Time'
  AND (pc.action = 'read' 
    OR pc.module IN ('okrs', 'kpis')
    OR pc.key IN (
      'users.profile.update:self',
      'tickets.thread.create:bu',
      'tickets.message.create:bu'
    ));

-- Permissões do grupo Assets Keys Manager
INSERT INTO public.permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM public.permission_groups pg, public.permission_catalog pc
WHERE pg.name = 'Assets Keys Manager'
  AND (pc.key LIKE 'assets.keys.%' OR pc.key = 'assets.inventory.read:bu');

-- Permissões do grupo Assets Inventory Manager
INSERT INTO public.permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM public.permission_groups pg, public.permission_catalog pc
WHERE pg.name = 'Assets Inventory Manager'
  AND pc.key LIKE 'assets.inventory.%';

-- Permissões do grupo Assets Gifts Manager
INSERT INTO public.permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM public.permission_groups pg, public.permission_catalog pc
WHERE pg.name = 'Assets Gifts Manager'
  AND pc.key LIKE 'assets.gifts.%';

-- Habilitar grupos padrão em todas as BUs existentes
INSERT INTO public.bu_permission_group_configs (bu_id, group_id, is_enabled)
SELECT bu.id, pg.id, true
FROM public.bu_units bu
CROSS JOIN public.permission_groups pg
WHERE bu.status = 'active'
ON CONFLICT (bu_id, group_id) DO NOTHING;

-- Atribuir grupo "Colaborador" a todos os usuários que não têm nenhum grupo
INSERT INTO public.bu_user_permission_groups (bu_id, user_id, group_id)
SELECT DISTINCT
  bum.bu_id,
  bum.user_id,
  pg.id
FROM public.bu_user_memberships bum
CROSS JOIN public.permission_groups pg
WHERE pg.name = 'Colaborador'
  AND NOT EXISTS (
    SELECT 1 FROM public.bu_user_permission_groups upg
    WHERE upg.bu_id = bum.bu_id AND upg.user_id = bum.user_id
  )
ON CONFLICT (bu_id, user_id, group_id) DO NOTHING;