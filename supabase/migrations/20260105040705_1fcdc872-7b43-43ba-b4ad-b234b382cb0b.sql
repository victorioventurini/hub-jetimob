-- Adicionar Resend ao catálogo de integrações
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
  display_order,
  documentation_url
) VALUES (
  'resend',
  'Resend',
  'Provedor de e-mail transacional de fallback. Usado quando SendGrid não está disponível.',
  'mail',
  '#000000',
  true,
  false,
  false,
  'active',
  7,
  'https://resend.com/docs'
);