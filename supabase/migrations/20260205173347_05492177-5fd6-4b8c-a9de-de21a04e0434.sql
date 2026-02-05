
-- Wave 8 Fase 4: Adicionar keys faltantes usadas em RLS policies
-- Essas keys são usadas nas RLS mas não existem no permission_catalog

INSERT INTO permission_catalog (key, module, resource, action, scope, description, status) VALUES
  -- Assets module - keys faltantes
  ('assets.keys.return:bu', 'assets', 'keys', 'return', 'bu', 'Registrar devolução de chaves', 'active'),
  ('assets.keys.settings.manage:bu', 'assets', 'keys_settings', 'manage', 'bu', 'Gerenciar configurações de chaves', 'active'),
  ('assets.settings.manage:bu', 'assets', 'settings', 'manage', 'bu', 'Gerenciar configurações de ativos', 'active'),
  
  -- Automations module
  ('automations.connection.create:bu', 'automations', 'connection', 'create', 'bu', 'Criar conexões de automação', 'active'),
  ('automations.connection.delete:bu', 'automations', 'connection', 'delete', 'bu', 'Remover conexões de automação', 'active'),
  ('automations.connection.update:bu', 'automations', 'connection', 'update', 'bu', 'Atualizar conexões de automação', 'active'),
  ('automations.token.create:bu', 'automations', 'token', 'create', 'bu', 'Criar tokens de automação', 'active'),
  ('automations.token.delete:bu', 'automations', 'token', 'delete', 'bu', 'Remover tokens de automação', 'active'),
  ('automations.token.update:bu', 'automations', 'token', 'update', 'bu', 'Atualizar tokens de automação', 'active'),
  
  -- KPIs module - key faltante
  ('kpis.metric.update:bu', 'kpis', 'metric', 'update', 'bu', 'Atualizar indicadores da BU', 'active'),
  
  -- Notifications module - keys faltantes
  ('notifications.alerts.manage:bu', 'notifications', 'alerts', 'manage', 'bu', 'Gerenciar alertas de notificação', 'active'),
  ('notifications.alerts.view:bu', 'notifications', 'alerts', 'view', 'bu', 'Visualizar alertas de notificação', 'active'),
  ('notifications.outbox.manage:bu', 'notifications', 'outbox', 'manage', 'bu', 'Gerenciar caixa de saída', 'active'),
  ('notifications.templates.manage:global', 'notifications', 'templates', 'manage', 'global', 'Gerenciar templates globais', 'active'),
  
  -- OKRs module - keys faltantes
  ('okrs.cycle.create:bu', 'okrs', 'cycle', 'create', 'bu', 'Criar ciclos de OKR', 'active'),
  ('okrs.cycle.delete:bu', 'okrs', 'cycle', 'delete', 'bu', 'Remover ciclos de OKR', 'active'),
  ('okrs.cycle.update:bu', 'okrs', 'cycle', 'update', 'bu', 'Atualizar ciclos de OKR', 'active'),
  
  -- Partners module - keys faltantes
  ('partners.company.create:bu', 'partners', 'company', 'create', 'bu', 'Criar empresas parceiras', 'active'),
  ('partners.company.delete:bu', 'partners', 'company', 'delete', 'bu', 'Remover empresas parceiras', 'active'),
  ('partners.company.update:bu', 'partners', 'company', 'update', 'bu', 'Atualizar empresas parceiras', 'active'),
  ('partners.contact.create:bu', 'partners', 'contact', 'create', 'bu', 'Criar contatos de parceiros', 'active'),
  ('partners.contact.delete:bu', 'partners', 'contact', 'delete', 'bu', 'Remover contatos de parceiros', 'active'),
  ('partners.contact.update:bu', 'partners', 'contact', 'update', 'bu', 'Atualizar contatos de parceiros', 'active'),
  
  -- People module (legacy naming - should be users)
  ('people.membership.manage:bu', 'people', 'membership', 'manage', 'bu', 'Gerenciar membros da BU', 'active'),
  ('people.membership.view:bu', 'people', 'membership', 'view', 'bu', 'Visualizar membros da BU', 'active'),
  
  -- Permissions module - keys faltantes
  ('permissions.migration.manage:bu', 'permissions', 'migration', 'manage', 'bu', 'Gerenciar migração de permissões', 'active'),
  ('permissions.override.manage:bu', 'permissions', 'override', 'manage', 'bu', 'Gerenciar overrides de permissão', 'active'),
  ('permissions.template.manage:bu', 'permissions', 'template', 'manage', 'bu', 'Gerenciar templates de permissão', 'active'),
  ('permissions.template.view:bu', 'permissions', 'template', 'view', 'bu', 'Visualizar templates de permissão', 'active'),
  
  -- Platform module - keys faltantes
  ('platform.audit.view:global', 'platform', 'audit', 'view', 'global', 'Visualizar logs de auditoria', 'active'),
  ('platform.bu.manage:global', 'platform', 'bu', 'manage', 'global', 'Gerenciar Business Units', 'active'),
  ('platform.cron.view:global', 'platform', 'cron', 'view', 'global', 'Visualizar jobs agendados', 'active'),
  ('platform.integrations.manage:global', 'platform', 'integrations', 'manage', 'global', 'Gerenciar integrações globais', 'active'),
  ('platform.modules.manage:global', 'platform', 'modules', 'manage', 'global', 'Gerenciar módulos da plataforma', 'active'),
  ('platform.notifications.manage:global', 'platform', 'notifications', 'manage', 'global', 'Gerenciar notificações globais', 'active'),
  ('platform.okr_reports.manage:global', 'platform', 'okr_reports', 'manage', 'global', 'Gerenciar relatórios OKR globais', 'active'),
  ('platform.settings.view:global', 'platform', 'settings', 'view', 'global', 'Visualizar configurações da plataforma', 'active'),
  
  -- Settings module - keys faltantes
  ('settings.ai.manage:bu', 'settings', 'ai', 'manage', 'bu', 'Gerenciar configurações de IA', 'active'),
  ('settings.integrations.manage:bu', 'settings', 'integrations', 'manage', 'bu', 'Gerenciar integrações da BU', 'active'),
  ('settings.locations.create:bu', 'settings', 'locations', 'create', 'bu', 'Criar localizações', 'active'),
  ('settings.locations.delete:bu', 'settings', 'locations', 'delete', 'bu', 'Remover localizações', 'active'),
  ('settings.locations.update:bu', 'settings', 'locations', 'update', 'bu', 'Atualizar localizações', 'active'),
  ('settings.modules.manage:bu', 'settings', 'modules', 'manage', 'bu', 'Gerenciar módulos da BU', 'active')
ON CONFLICT (key) DO NOTHING;
