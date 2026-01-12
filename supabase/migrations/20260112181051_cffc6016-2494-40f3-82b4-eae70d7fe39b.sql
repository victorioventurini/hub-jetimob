-- Remove a FK incorreta que referencia auth.users
-- Mantém apenas fk_ai_agents_created_by que referencia profiles(id)
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_created_by_fkey;