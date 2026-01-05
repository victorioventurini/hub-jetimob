-- Adicionar N8N, Make e Zapier ao catálogo de integrações
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
) VALUES 
(
  'n8n',
  'n8n',
  'Plataforma de automação de workflows. Conecte o Hub a centenas de serviços.',
  'workflow',
  '#FF6D5A',
  true,
  true,
  false,
  'active',
  10,
  'https://docs.n8n.io'
),
(
  'make',
  'Make (Integromat)',
  'Plataforma visual de automação para conectar apps e automatizar workflows.',
  'zap',
  '#6C63FF',
  true,
  true,
  false,
  'active',
  11,
  'https://www.make.com/en/help'
),
(
  'zapier',
  'Zapier',
  'Conecte o Hub a milhares de apps com automações sem código.',
  'zap',
  '#FF4A00',
  true,
  true,
  false,
  'active',
  12,
  'https://zapier.com/help'
)
ON CONFLICT (integration_key) DO NOTHING;