-- =============================================
-- PERMISSION TEMPLATES EVOLUTION
-- TCR v2.4.0 Compliant
-- =============================================

-- 1) Add slug and is_system columns to permission_groups
ALTER TABLE public.permission_groups
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- Create index for slug
CREATE INDEX IF NOT EXISTS idx_permission_groups_slug ON public.permission_groups(slug) WHERE slug IS NOT NULL;

-- 2) Insert all required permission keys (ignoring duplicates)
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status)
VALUES
  -- HOME / General
  ('home.view:bu', 'home', 'dashboard', 'view', 'bu', 'Visualizar dashboard da home', 'active'),
  
  -- USERS
  ('users.list.view:bu', 'users', 'list', 'view', 'bu', 'Listar usuários da BU', 'active'),
  ('users.profile.view:bu', 'users', 'profile', 'view', 'bu', 'Visualizar perfil de usuários', 'active'),
  ('users.profile.manage:bu', 'users', 'profile', 'manage', 'bu', 'Gerenciar perfis de usuários', 'active'),
  
  -- TEAMS
  ('teams.view:bu', 'teams', 'team', 'view', 'bu', 'Visualizar times', 'active'),
  ('teams.manage:bu', 'teams', 'team', 'manage', 'bu', 'Gerenciar times', 'active'),
  
  -- TICKETS
  ('tickets.ticket.view:bu', 'tickets', 'ticket', 'view', 'bu', 'Visualizar tickets', 'active'),
  ('tickets.ticket.create_internal:bu', 'tickets', 'ticket', 'create_internal', 'bu', 'Criar tickets internos', 'active'),
  ('tickets.ticket.create_external:bu', 'tickets', 'ticket', 'create_external', 'bu', 'Criar tickets externos', 'active'),
  ('tickets.ticket.update_status:bu', 'tickets', 'ticket', 'update_status', 'bu', 'Atualizar status de tickets', 'active'),
  ('tickets.ticket.assign:bu', 'tickets', 'ticket', 'assign', 'bu', 'Atribuir tickets', 'active'),
  ('tickets.message.create:bu', 'tickets', 'message', 'create', 'bu', 'Criar mensagens em tickets', 'active'),
  ('tickets.attachment.create:bu', 'tickets', 'attachment', 'create', 'bu', 'Anexar arquivos em tickets', 'active'),
  ('tickets.settings.manage:bu', 'tickets', 'settings', 'manage', 'bu', 'Gerenciar configurações de tickets', 'active'),
  ('tickets.categories.manage:bu', 'tickets', 'categories', 'manage', 'bu', 'Gerenciar categorias de tickets', 'active'),
  ('tickets.partners.manage:bu', 'tickets', 'partners', 'manage', 'bu', 'Gerenciar empresas parceiras', 'active'),
  ('tickets.routing.manage:bu', 'tickets', 'routing', 'manage', 'bu', 'Gerenciar regras de roteamento', 'active'),
  ('tickets.visibility.override:bu', 'tickets', 'visibility', 'override', 'bu', 'Override de visibilidade de tickets', 'active'),
  
  -- OKRs - Cancel actions (using cancel instead of delete)
  ('okrs.org_objective.cancel:bu', 'okrs', 'org_objective', 'cancel', 'bu', 'Cancelar objetivos organizacionais', 'active'),
  ('okrs.team_objective.cancel:team', 'okrs', 'team_objective', 'cancel', 'team', 'Cancelar objetivos de time', 'active'),
  ('okrs.org_kr.cancel:bu', 'okrs', 'org_kr', 'cancel', 'bu', 'Cancelar KRs organizacionais', 'active'),
  ('okrs.team_kr.cancel:team', 'okrs', 'team_kr', 'cancel', 'team', 'Cancelar KRs de time', 'active'),
  
  -- OKRs - View
  ('okrs.view:bu', 'okrs', 'general', 'view', 'bu', 'Visualizar OKRs', 'active'),
  ('okrs.links.manage:bu', 'okrs', 'links', 'manage', 'bu', 'Gerenciar vínculos de OKRs', 'active'),
  ('okrs.initiative.manage:team', 'okrs', 'initiative', 'manage', 'team', 'Gerenciar iniciativas do time', 'active'),
  
  -- KPIs
  ('kpis.view:bu', 'kpis', 'general', 'view', 'bu', 'Visualizar KPIs', 'active'),
  ('kpis.value.add:bu', 'kpis', 'value', 'add', 'bu', 'Adicionar valores de KPI', 'active'),
  ('kpis.value.update_own:bu', 'kpis', 'value', 'update_own', 'bu', 'Atualizar valores próprios de KPI', 'active'),
  ('kpis.metric.view:bu', 'kpis', 'metric', 'view', 'bu', 'Visualizar métricas', 'active'),
  ('kpis.metric.update_scoped:team', 'kpis', 'metric', 'update_scoped', 'team', 'Atualizar métricas do time', 'active'),
  ('kpis.metric.disable:bu', 'kpis', 'metric', 'disable', 'bu', 'Desativar métricas', 'active'),
  ('kpis.settings.manage:bu', 'kpis', 'settings', 'manage', 'bu', 'Gerenciar configurações de KPIs', 'active'),
  
  -- ASSETS - General
  ('assets.view:bu', 'assets', 'general', 'view', 'bu', 'Visualizar módulo de assets', 'active'),
  
  -- ASSETS - Inventory
  ('assets.inventory.view:bu', 'assets', 'inventory', 'view', 'bu', 'Visualizar inventário', 'active'),
  ('assets.inventory.movement.update:bu', 'assets', 'inventory_movement', 'update', 'bu', 'Atualizar movimentações', 'active'),
  ('assets.inventory.checkout:bu', 'assets', 'inventory', 'checkout', 'bu', 'Retirar itens do inventário', 'active'),
  ('assets.inventory.return:bu', 'assets', 'inventory', 'return', 'bu', 'Devolver itens ao inventário', 'active'),
  ('assets.inventory.transfer:bu', 'assets', 'inventory', 'transfer', 'bu', 'Transferir itens entre locais', 'active'),
  ('assets.inventory.maintenance:bu', 'assets', 'inventory', 'maintenance', 'bu', 'Registrar manutenção de itens', 'active'),
  ('assets.inventory.sensitive.view:bu', 'assets', 'inventory_sensitive', 'view', 'bu', 'Ver dados sensíveis (serial, nota fiscal)', 'active'),
  ('assets.inventory.write_off:bu', 'assets', 'inventory', 'write_off', 'bu', 'Baixar itens do inventário', 'active'),
  ('assets.categories.manage:bu', 'assets', 'categories', 'manage', 'bu', 'Gerenciar categorias de assets', 'active'),
  
  -- ASSETS - Keys
  ('assets.keys.view:bu', 'assets', 'keys', 'view', 'bu', 'Visualizar chaves', 'active'),
  ('assets.keys.keyring.checkout:bu', 'assets', 'keyring', 'checkout', 'bu', 'Retirar chaveiros', 'active'),
  ('assets.keys.keyring.return:bu', 'assets', 'keyring', 'return', 'bu', 'Devolver chaveiros', 'active'),
  ('assets.keys.movement.create:bu', 'assets', 'keys_movement', 'create', 'bu', 'Registrar movimentação de chaves', 'active'),
  ('assets.keys.sensitive.view:bu', 'assets', 'keys_sensitive', 'view', 'bu', 'Ver dados sensíveis de chaves', 'active'),
  ('assets.keys.claviculary.manage:bu', 'assets', 'claviculary', 'manage', 'bu', 'Gerenciar claviculários', 'active'),
  ('assets.keys.hooks.manage:bu', 'assets', 'hooks', 'manage', 'bu', 'Gerenciar ganchos', 'active'),
  ('assets.keys.keyring.manage:bu', 'assets', 'keyring', 'manage', 'bu', 'Gerenciar chaveiros', 'active'),
  ('assets.keys.key.manage:bu', 'assets', 'key', 'manage', 'bu', 'Gerenciar chaves', 'active'),
  ('assets.keys.hook_override:bu', 'assets', 'hook', 'override', 'bu', 'Override de gancho com justificativa', 'active'),
  
  -- ASSETS - Gifts
  ('assets.gifts.view:bu', 'assets', 'gifts', 'view', 'bu', 'Visualizar brindes', 'active'),
  ('assets.gifts.movement.create:bu', 'assets', 'gifts_movement', 'create', 'bu', 'Registrar movimentação de brindes', 'active'),
  ('assets.gifts.adjustment.create:bu', 'assets', 'gifts_adjustment', 'create', 'bu', 'Registrar ajuste de estoque', 'active'),
  ('assets.gifts.item.manage:bu', 'assets', 'gifts_item', 'manage', 'bu', 'Gerenciar itens de brinde', 'active'),
  ('assets.gifts.batch.manage:bu', 'assets', 'gifts_batch', 'manage', 'bu', 'Gerenciar lotes de brindes', 'active'),
  ('assets.gifts.settings.manage:bu', 'assets', 'gifts_settings', 'manage', 'bu', 'Gerenciar configurações de brindes', 'active'),
  
  -- HUB - Settings
  ('hub.settings.manage:bu', 'hub', 'settings', 'manage', 'bu', 'Gerenciar configurações da BU', 'active'),
  
  -- PLATFORM - Global permissions (super_admin only)
  ('platform.permissions.manage:global', 'platform', 'permissions', 'manage', 'global', 'Gerenciar catálogo global de permissões', 'active'),
  ('platform.settings.manage:global', 'platform', 'settings', 'manage', 'global', 'Gerenciar configurações globais da plataforma', 'active')
ON CONFLICT (key) DO NOTHING;

-- 3) Create system templates (is_system = true)

-- Template: Colaborador Base
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Colaborador (Base)', 'collaborator_base', 'Acesso básico para todos os colaboradores', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Estagiário
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Estagiário', 'intern', 'Acesso limitado para estagiários', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Visitor (Read-only)
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Visitor (Read-only)', 'viewer_readonly', 'Acesso apenas leitura', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: OKRs Manager
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('OKRs Manager', 'okrs_manager', 'Gestão completa de OKRs da BU', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: KPI Editor
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('KPI Editor', 'kpi_editor', 'Edição de valores de KPIs próprios e do time', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: KPI Admin
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('KPI Admin', 'kpi_admin', 'Administração completa de KPIs da BU', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Tickets Operator
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Tickets Operator', 'tickets_operator', 'Operação de tickets (criar, atribuir, atualizar)', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Tickets Admin
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Tickets Admin', 'tickets_admin', 'Administração completa de tickets', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Inventory Manager
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Inventory Manager', 'inventory_manager', 'Gestão operacional de inventário', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Inventory Admin
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Inventory Admin', 'inventory_admin', 'Administração completa de inventário', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Keys Manager
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Keys Manager', 'keys_manager', 'Gestão operacional de chaves', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Keys Admin
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Keys Admin', 'keys_admin', 'Administração completa de chaves', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Gifts Manager
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Gifts Manager', 'gifts_manager', 'Gestão operacional de brindes', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: Gifts Admin
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('Gifts Admin', 'gifts_admin', 'Administração completa de brindes', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- Template: BU Admin
INSERT INTO public.permission_groups (name, slug, description, is_system, status)
VALUES ('BU Admin', 'bu_admin', 'Administrador da Business Unit', true, 'active')
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, is_system = true;

-- 4) Populate template permissions
-- We'll use a DO block to handle the permission mapping

DO $$
DECLARE
  v_group_id uuid;
  v_perm_id uuid;
BEGIN
  -- Helper function to add permission to group
  -- Collaborator Base
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'collaborator_base';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'home.view:bu',
      'users.list.view:bu',
      'users.profile.view:bu',
      'teams.view:bu',
      'okrs.view:bu',
      'kpis.view:bu',
      'tickets.ticket.create_internal:bu',
      'tickets.ticket.view:bu',
      'tickets.message.create:bu',
      'tickets.attachment.create:bu',
      'assets.view:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Intern (same as collaborator but with initiative permissions)
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'intern';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'home.view:bu',
      'users.list.view:bu',
      'users.profile.view:bu',
      'teams.view:bu',
      'okrs.view:bu',
      'okrs.initiative.create:team',
      'okrs.initiative.update:self_or_owner',
      'okrs.initiative.read:team_tree',
      'kpis.view:bu',
      'tickets.ticket.create_internal:bu',
      'tickets.ticket.view:bu',
      'tickets.message.create:bu',
      'assets.view:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Viewer (Read-only)
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'viewer_readonly';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'home.view:bu',
      'users.list.view:bu',
      'users.profile.view:bu',
      'teams.view:bu',
      'okrs.view:bu',
      'kpis.view:bu',
      'tickets.ticket.view:bu',
      'assets.view:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- OKRs Manager
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'okrs_manager';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'okrs.view:bu',
      'okrs.org_objective.create:bu',
      'okrs.org_objective.update:self_or_owner',
      'okrs.org_objective.cancel:bu',
      'okrs.org_kr.create:bu',
      'okrs.org_kr.update:self_or_owner',
      'okrs.org_kr.cancel:bu',
      'okrs.team_objective.create:team',
      'okrs.team_objective.update:self_or_owner',
      'okrs.team_objective.cancel:team',
      'okrs.team_kr.create:team',
      'okrs.team_kr.update:self_or_owner',
      'okrs.team_kr.cancel:team',
      'okrs.checkin.create:self_or_owner',
      'okrs.initiative.manage:team',
      'okrs.links.manage:bu',
      'okrs.insights.view:bu',
      'okrs.insights.manage:bu',
      'okrs.health.view:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- KPI Editor
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'kpi_editor';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'kpis.view:bu',
      'kpis.value.add:bu',
      'kpis.value.update_own:bu',
      'kpis.metric.view:bu',
      'kpis.metric.update_scoped:team'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- KPI Admin
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'kpi_admin';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'kpis.view:bu',
      'kpis.metric.create:bu',
      'kpis.metric.read:bu',
      'kpis.metric.update:self_or_owner',
      'kpis.metric.disable:bu',
      'kpis.value.add:bu',
      'kpis.value.read:bu',
      'kpis.settings.manage:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Tickets Operator
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'tickets_operator';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'tickets.ticket.view:bu',
      'tickets.ticket.create_internal:bu',
      'tickets.ticket.create_external:bu',
      'tickets.ticket.update_status:bu',
      'tickets.ticket.assign:bu',
      'tickets.message.create:bu',
      'tickets.attachment.create:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Tickets Admin
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'tickets_admin';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'tickets.ticket.view:bu',
      'tickets.ticket.create_internal:bu',
      'tickets.ticket.create_external:bu',
      'tickets.ticket.update_status:bu',
      'tickets.ticket.assign:bu',
      'tickets.message.create:bu',
      'tickets.attachment.create:bu',
      'tickets.settings.manage:bu',
      'tickets.categories.manage:bu',
      'tickets.partners.manage:bu',
      'tickets.routing.manage:bu',
      'tickets.visibility.override:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Inventory Manager
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'inventory_manager';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'assets.view:bu',
      'assets.inventory.view:bu',
      'assets.inventory.read:bu',
      'assets.inventory.movement.create:bu',
      'assets.inventory.movement.update:bu',
      'assets.inventory.checkout:bu',
      'assets.inventory.return:bu',
      'assets.inventory.transfer:bu',
      'assets.inventory.maintenance:bu',
      'assets.inventory.sensitive.view:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Inventory Admin
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'inventory_admin';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'assets.view:bu',
      'assets.inventory.view:bu',
      'assets.inventory.read:bu',
      'assets.inventory.create:bu',
      'assets.inventory.update:bu',
      'assets.inventory.movement.create:bu',
      'assets.inventory.movement.update:bu',
      'assets.inventory.checkout:bu',
      'assets.inventory.return:bu',
      'assets.inventory.transfer:bu',
      'assets.inventory.maintenance:bu',
      'assets.inventory.sensitive.view:bu',
      'assets.inventory.write_off:bu',
      'assets.categories.manage:bu',
      'assets.settings.manage'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Keys Manager
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'keys_manager';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'assets.view:bu',
      'assets.keys.view:bu',
      'assets.keys.read:bu',
      'assets.keys.keyring.checkout:bu',
      'assets.keys.keyring.return:bu',
      'assets.keys.movement.create:bu',
      'assets.keys.sensitive.view:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Keys Admin
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'keys_admin';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'assets.view:bu',
      'assets.keys.view:bu',
      'assets.keys.read:bu',
      'assets.keys.create:bu',
      'assets.keys.update:bu',
      'assets.keys.keyring.checkout:bu',
      'assets.keys.keyring.return:bu',
      'assets.keys.movement.create:bu',
      'assets.keys.sensitive.view:bu',
      'assets.keys.claviculary.manage:bu',
      'assets.keys.hooks.manage:bu',
      'assets.keys.keyring.manage:bu',
      'assets.keys.key.manage:bu',
      'assets.keys.hook_override:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Gifts Manager
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'gifts_manager';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'assets.view:bu',
      'assets.gifts.view:bu',
      'assets.gifts.read:bu',
      'assets.gifts.movement.create:bu',
      'assets.gifts.adjustment.create:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Gifts Admin
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'gifts_admin';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.key IN (
      'assets.view:bu',
      'assets.gifts.view:bu',
      'assets.gifts.read:bu',
      'assets.gifts.create:bu',
      'assets.gifts.update:bu',
      'assets.gifts.movement.create:bu',
      'assets.gifts.adjustment.create:bu',
      'assets.gifts.item.manage:bu',
      'assets.gifts.batch.manage:bu',
      'assets.gifts.settings.manage:bu'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- BU Admin (all BU-level permissions)
  SELECT id INTO v_group_id FROM public.permission_groups WHERE slug = 'bu_admin';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.permission_group_permissions (group_id, permission_id)
    SELECT v_group_id, pc.id
    FROM public.permission_catalog pc
    WHERE pc.scope IN ('bu', 'team', 'squad', 'self', 'self_or_owner', 'team_tree')
      AND pc.status = 'active'
    ON CONFLICT DO NOTHING;
  END IF;

END $$;