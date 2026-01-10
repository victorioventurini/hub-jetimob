-- Atualizar modelo dos agentes para gpt-4o-mini (mais estável)
UPDATE ai_agents 
SET model_name = 'gpt-4o-mini' 
WHERE slug IN ('coach-okrs', 'cultura', 'alinhamento-estrategico');