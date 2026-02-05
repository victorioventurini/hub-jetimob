-- Wave 8: Add missing BU settings permission keys to catalog
-- These keys are used in EditBuDialog.tsx and LocationDialog.tsx but don't exist

INSERT INTO permission_catalog (key, module, resource, action, scope, description, status)
VALUES
  ('bu.settings.manage:bu', 'bu', 'settings', 'manage', 'bu', 'Gerenciar configurações gerais da BU', 'active'),
  ('bu.settings.view:bu', 'bu', 'settings', 'view', 'bu', 'Visualizar configurações da BU', 'active'),
  ('bu.location.manage:bu', 'bu', 'location', 'manage', 'bu', 'Gerenciar sedes e localizações da BU', 'active'),
  ('bu.location.view:bu', 'bu', 'location', 'view', 'bu', 'Visualizar sedes e localizações da BU', 'active')
ON CONFLICT (key) DO NOTHING;