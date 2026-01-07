
-- ==========================================
-- RECONSTRUÇÃO COMPLETA DO MODELO DE PERMISSÕES
-- ==========================================

-- PASSO 1: Remover todos os vínculos de usuários com grupos
DELETE FROM bu_user_permission_groups;

-- PASSO 2: Remover todas as associações de permissões com grupos
DELETE FROM permission_group_permissions;

-- PASSO 3: Remover todos os grupos/templates existentes
DELETE FROM permission_groups;

-- PASSO 4: Remover configurações de grupos por BU
DELETE FROM bu_permission_group_configs;

-- ==========================================
-- CRIAR NOVOS TEMPLATES
-- ==========================================

-- CAMADA 0: BASE (OBRIGATÓRIA)

-- A) Internal User Base (collaborator_base)
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Colaborador Base',
  'collaborator_base',
  'Acesso básico obrigatório para todos os colaboradores internos. Inclui visualização de módulos, criação de tickets internos e gestão do próprio perfil.',
  true,
  'active'
);

-- B) External User Base (external_contact_base)
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Contato Externo',
  'external_contact_base',
  'Acesso restrito para contatos de empresas parceiras. Apenas interação via tickets onde participa.',
  true,
  'active'
);

-- CAMADA ADMINISTRATIVA

-- C) BU Admin
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Administrador da BU',
  'bu_admin',
  'Acesso total a todos os módulos e configurações da Business Unit. Pode gerenciar permissões e usuários.',
  true,
  'active'
);

-- CAMADA DE RESPONSABILIDADES - TICKETS

-- Tickets Operator
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Tickets: Operador',
  'tickets_operator',
  'Criar, atualizar e atribuir tickets. Responder mensagens e gerenciar anexos.',
  true,
  'active'
);

-- Tickets Admin
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Tickets: Admin',
  'tickets_admin',
  'Gestão completa de tickets incluindo categorias, parceiros, roteamento, visibilidade e configurações.',
  true,
  'active'
);

-- CAMADA DE RESPONSABILIDADES - OKRs

-- OKRs Viewer
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'OKRs: Visualização',
  'okrs_viewer',
  'Leitura de OKRs, ciclos, iniciativas e check-ins.',
  true,
  'active'
);

-- OKRs Team Manager
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'OKRs: Gestor de Time',
  'okrs_team_manager',
  'Criar e editar OKRs e iniciativas do time que lidera. Não inclui cancelamento.',
  true,
  'active'
);

-- OKRs BU Manager
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'OKRs: Gestor da BU',
  'okrs_bu_manager',
  'Gestão completa de OKRs da BU, incluindo cancelamento e configurações.',
  true,
  'active'
);

-- CAMADA DE RESPONSABILIDADES - KPIs

-- KPI Viewer
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'KPIs: Visualização',
  'kpi_viewer',
  'Leitura de métricas e valores de KPIs.',
  true,
  'active'
);

-- KPI Editor (Scoped)
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'KPIs: Editor',
  'kpi_editor',
  'Atualiza valores de KPIs próprios e do time que lidera.',
  true,
  'active'
);

-- KPI Admin (BU)
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'KPIs: Admin',
  'kpi_admin',
  'Criar métricas, gerenciar configurações e definir metas globais da BU.',
  true,
  'active'
);

-- CAMADA DE RESPONSABILIDADES - ASSETS/INVENTÁRIO

-- Inventory Manager
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Inventário: Gestor',
  'inventory_manager',
  'Movimentar, emprestar e devolver itens de inventário. Visualizar dados sensíveis.',
  true,
  'active'
);

-- Inventory Admin
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Inventário: Admin',
  'inventory_admin',
  'Gestão completa de inventário incluindo cadastro, baixa e configurações.',
  true,
  'active'
);

-- CAMADA DE RESPONSABILIDADES - ASSETS/CHAVES

-- Keys Manager
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Chaves: Gestor',
  'keys_manager',
  'Retirar e devolver chaveiros. Registrar movimentações. Visualizar dados sensíveis.',
  true,
  'active'
);

-- Keys Admin
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Chaves: Admin',
  'keys_admin',
  'Gestão completa de chaves incluindo claviculários, ganchos e configurações.',
  true,
  'active'
);

-- CAMADA DE RESPONSABILIDADES - ASSETS/BRINDES

-- Gifts Manager
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Brindes: Gestor',
  'gifts_manager',
  'Registrar movimentações e ajustes de brindes. Visualizar estoque.',
  true,
  'active'
);

-- Gifts Admin
INSERT INTO permission_groups (id, name, slug, description, is_system, status)
VALUES (
  gen_random_uuid(),
  'Brindes: Admin',
  'gifts_admin',
  'Gestão completa de brindes incluindo cadastro, lotes e configurações.',
  true,
  'active'
);

-- ==========================================
-- ASSOCIAR PERMISSION KEYS AOS TEMPLATES
-- ==========================================

-- COLLABORATOR_BASE
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'collaborator_base'
  AND pc.key IN (
    -- Home
    'home.view:bu',
    -- Assets view
    'assets.view:bu',
    -- OKRs view
    'okrs.view:bu',
    -- KPIs view
    'kpis.view:bu',
    -- Teams view
    'teams.view:bu',
    -- Tickets básico
    'tickets.view:bu',
    'tickets.thread.create:bu',
    'tickets.message.create:bu',
    'tickets.attachment.create:bu',
    -- Users
    'users.view:bu',
    'users.profile.view:self',
    'users.profile.update:self'
  )
  AND pc.status = 'active';

-- EXTERNAL_CONTACT_BASE
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'external_contact_base'
  AND pc.key IN (
    'home.view:bu',
    'tickets.view:bu',
    'tickets.thread.read:bu',
    'tickets.message.create:bu',
    'tickets.attachment.create:bu'
  )
  AND pc.status = 'active';

-- BU_ADMIN (todas as permissões de escopo bu)
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'bu_admin'
  AND pc.scope IN ('bu', 'self', 'self_or_owner', 'team', 'team_tree')
  AND pc.status = 'active';

-- TICKETS_OPERATOR
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'tickets_operator'
  AND pc.key IN (
    'tickets.view:bu',
    'tickets.thread.create:bu',
    'tickets.thread.read:bu',
    'tickets.thread.update:bu',
    'tickets.message.create:bu',
    'tickets.attachment.create:bu',
    'tickets.ticket.assign:bu',
    'tickets.ticket.create_internal:bu',
    'tickets.ticket.create_external:bu',
    'tickets.ticket.update_status:bu'
  )
  AND pc.status = 'active';

-- TICKETS_ADMIN (inclui operator + admin)
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'tickets_admin'
  AND pc.module = 'tickets'
  AND pc.status = 'active';

-- OKRS_VIEWER
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'okrs_viewer'
  AND pc.key IN (
    'okrs.view:bu',
    'okrs.cycle.read:bu',
    'okrs.org_objective.read:bu',
    'okrs.org_kr.read:bu',
    'okrs.team_objective.read:bu',
    'okrs.team_kr.read:bu',
    'okrs.initiative.read:bu',
    'okrs.checkin.read:bu',
    'okrs.health.view:bu',
    'okrs.insights.view:bu'
  )
  AND pc.status = 'active';

-- OKRS_TEAM_MANAGER
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'okrs_team_manager'
  AND pc.key IN (
    -- Leitura
    'okrs.view:bu',
    'okrs.cycle.read:bu',
    'okrs.org_objective.read:bu',
    'okrs.org_kr.read:bu',
    'okrs.team_objective.read:bu',
    'okrs.team_kr.read:bu',
    'okrs.initiative.read:bu',
    'okrs.checkin.read:bu',
    'okrs.health.view:bu',
    'okrs.insights.view:bu',
    -- Escrita escopo time
    'okrs.team_objective.create:team',
    'okrs.team_objective.update:team',
    'okrs.team_kr.create:team',
    'okrs.team_kr.update:team',
    'okrs.initiative.create:bu',
    'okrs.initiative.update:bu',
    'okrs.checkin.create:bu',
    'okrs.checkin.update:bu',
    'okrs.links.manage:bu'
  )
  AND pc.status = 'active';

-- OKRS_BU_MANAGER (gestão completa)
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'okrs_bu_manager'
  AND pc.module = 'okrs'
  AND pc.status = 'active';

-- KPI_VIEWER
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'kpi_viewer'
  AND pc.key IN (
    'kpis.view:bu',
    'kpis.metric.view:bu',
    'kpis.metric.read:bu',
    'kpis.value.read:bu'
  )
  AND pc.status = 'active';

-- KPI_EDITOR
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'kpi_editor'
  AND pc.key IN (
    'kpis.view:bu',
    'kpis.metric.view:bu',
    'kpis.metric.read:bu',
    'kpis.value.read:bu',
    'kpis.value.add:bu',
    'kpis.value.update_own:bu',
    'kpis.metric.update_scoped:team'
  )
  AND pc.status = 'active';

-- KPI_ADMIN
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'kpi_admin'
  AND pc.module = 'kpis'
  AND pc.status = 'active';

-- INVENTORY_MANAGER
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'inventory_manager'
  AND pc.key IN (
    'assets.view:bu',
    'assets.inventory.view:bu',
    'assets.inventory.read:bu',
    'assets.inventory.checkout:bu',
    'assets.inventory.return:bu',
    'assets.inventory.transfer:bu',
    'assets.inventory.maintenance:bu',
    'assets.inventory.movement.create:bu',
    'assets.inventory.movement.update:bu',
    'assets.inventory.sensitive.view:bu'
  )
  AND pc.status = 'active';

-- INVENTORY_ADMIN
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'inventory_admin'
  AND pc.key IN (
    'assets.view:bu',
    'assets.inventory.view:bu',
    'assets.inventory.read:bu',
    'assets.inventory.create:bu',
    'assets.inventory.update:bu',
    'assets.inventory.delete:bu',
    'assets.inventory.checkout:bu',
    'assets.inventory.return:bu',
    'assets.inventory.transfer:bu',
    'assets.inventory.maintenance:bu',
    'assets.inventory.write_off:bu',
    'assets.inventory.movement.create:bu',
    'assets.inventory.movement.update:bu',
    'assets.inventory.sensitive.view:bu',
    'assets.categories.manage:bu',
    'assets.settings.manage'
  )
  AND pc.status = 'active';

-- KEYS_MANAGER
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'keys_manager'
  AND pc.key IN (
    'assets.view:bu',
    'assets.keys.view:bu',
    'assets.keys.read:bu',
    'assets.keys.keyring.checkout:bu',
    'assets.keys.keyring.return:bu',
    'assets.keys.movement.create:bu',
    'assets.keys.sensitive.view:bu'
  )
  AND pc.status = 'active';

-- KEYS_ADMIN
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'keys_admin'
  AND pc.key IN (
    'assets.view:bu',
    'assets.keys.view:bu',
    'assets.keys.read:bu',
    'assets.keys.create:bu',
    'assets.keys.update:bu',
    'assets.keys.delete:bu',
    'assets.keys.checkout:bu',
    'assets.keys.keyring.checkout:bu',
    'assets.keys.keyring.return:bu',
    'assets.keys.keyring.manage:bu',
    'assets.keys.movement.create:bu',
    'assets.keys.sensitive.view:bu',
    'assets.keys.claviculary.manage:bu',
    'assets.keys.hooks.manage:bu',
    'assets.keys.hook_override:bu',
    'assets.keys.key.manage:bu'
  )
  AND pc.status = 'active';

-- GIFTS_MANAGER
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'gifts_manager'
  AND pc.key IN (
    'assets.view:bu',
    'assets.gifts.view:bu',
    'assets.gifts.read:bu',
    'assets.gifts.movement.create:bu',
    'assets.gifts.adjustment.create:bu'
  )
  AND pc.status = 'active';

-- GIFTS_ADMIN
INSERT INTO permission_group_permissions (group_id, permission_id)
SELECT pg.id, pc.id
FROM permission_groups pg
CROSS JOIN permission_catalog pc
WHERE pg.slug = 'gifts_admin'
  AND pc.key IN (
    'assets.view:bu',
    'assets.gifts.view:bu',
    'assets.gifts.read:bu',
    'assets.gifts.create:bu',
    'assets.gifts.update:bu',
    'assets.gifts.delete:bu',
    'assets.gifts.movement.create:bu',
    'assets.gifts.adjustment.create:bu',
    'assets.gifts.batch.manage:bu',
    'assets.gifts.item.manage:bu',
    'assets.gifts.settings.manage:bu'
  )
  AND pc.status = 'active';
