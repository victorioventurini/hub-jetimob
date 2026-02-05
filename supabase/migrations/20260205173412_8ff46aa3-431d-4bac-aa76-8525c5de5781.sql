
-- Wave 8 Fase 5: Normalizar keys sem sufixo :scope
-- Criar aliases para manter retrocompatibilidade

-- 1. Adicionar as keys com sufixo :scope (versão correta)
INSERT INTO permission_catalog (key, module, resource, action, scope, description, status) VALUES
  -- Assets
  ('assets.settings.manage:bu', 'assets', 'settings', 'manage', 'bu', 'Gerenciar configurações de ativos (normalizado)', 'active'),
  
  -- Hub
  ('hub.global.manage:global', 'hub', 'global', 'manage', 'global', 'Gerenciar configurações globais do hub', 'active'),
  ('hub.global.view:global', 'hub', 'global', 'view', 'global', 'Visualizar configurações globais do hub', 'active'),
  ('hub.permissions.manage:bu', 'hub', 'permissions', 'manage', 'bu', 'Gerenciar permissões do hub', 'active'),
  ('hub.permissions.view:bu', 'hub', 'permissions', 'view', 'bu', 'Visualizar permissões do hub', 'active'),
  
  -- Platform
  ('platform.settings.manage:global', 'platform', 'settings', 'manage', 'global', 'Gerenciar configurações da plataforma (normalizado)', 'active'),
  
  -- Settings
  ('settings.job_titles.manage:bu', 'settings', 'job_titles', 'manage', 'bu', 'Gerenciar cargos', 'active'),
  ('settings.job_titles.view:bu', 'settings', 'job_titles', 'view', 'bu', 'Visualizar cargos', 'active'),
  
  -- Tickets
  ('tickets.contact_capabilities.manage:bu', 'tickets', 'contact_capabilities', 'manage', 'bu', 'Gerenciar capacidades de contato', 'active'),
  ('tickets.contact_capabilities.view:bu', 'tickets', 'contact_capabilities', 'view', 'bu', 'Visualizar capacidades de contato', 'active'),
  ('tickets.partner_contacts.manage:bu', 'tickets', 'partner_contacts', 'manage', 'bu', 'Gerenciar contatos de parceiros', 'active'),
  ('tickets.partner_contacts.view:bu', 'tickets', 'partner_contacts', 'view', 'bu', 'Visualizar contatos de parceiros', 'active'),
  ('tickets.routing.manage:bu', 'tickets', 'routing', 'manage', 'bu', 'Gerenciar roteamento de tickets', 'active'),
  ('tickets.routing.view:bu', 'tickets', 'routing', 'view', 'bu', 'Visualizar roteamento de tickets', 'active'),
  ('tickets.settings.manage:bu', 'tickets', 'settings', 'manage', 'bu', 'Gerenciar configurações de tickets', 'active'),
  ('tickets.settings.view:bu', 'tickets', 'settings', 'view', 'bu', 'Visualizar configurações de tickets', 'active'),
  
  -- Users
  ('users.profile.create:bu', 'users', 'profile', 'create', 'bu', 'Criar perfis de usuário', 'active'),
  ('users.profile.delete:bu', 'users', 'profile', 'delete', 'bu', 'Remover perfis de usuário', 'active')
ON CONFLICT (key) DO NOTHING;

-- 2. Marcar as keys antigas como deprecated (não remover para retrocompatibilidade)
UPDATE permission_catalog 
SET description = description || ' [DEPRECATED - usar ' || key || ':' || scope || ']'
WHERE key NOT LIKE '%:%'
  AND status = 'active'
  AND description NOT LIKE '%DEPRECATED%';
