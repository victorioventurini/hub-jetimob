UPDATE hub_integrations_catalog
SET 
  name = 'LLMs / Agentes de IA',
  description = 'Integração com modelos de IA (Gemini, GPT) para chat, automações e agentes inteligentes',
  updated_at = now()
WHERE integration_key = 'chatgpt';