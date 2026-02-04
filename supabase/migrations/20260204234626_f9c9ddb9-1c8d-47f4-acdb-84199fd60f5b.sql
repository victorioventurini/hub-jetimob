-- Adicionar Google Tag Manager ao catálogo de integrações
INSERT INTO hub_integrations_catalog (
  integration_key,
  name,
  description,
  icon,
  color,
  supports_global_config,
  supports_bu_override,
  supports_agents,
  status,
  display_order
) VALUES (
  'google-tag-manager',
  'Google Tag Manager',
  'Gerenciador de tags para analytics, marketing e tracking. Configure GA4, conversões e remarketing.',
  'tag',
  '#4285F4',
  true,
  false,
  false,
  'active',
  1
);