-- =====================================================
-- P1 Performance: Índices para tabelas com bu_id faltante
-- =====================================================

-- AI Agents: índice para listagem por BU
CREATE INDEX IF NOT EXISTS idx_ai_agents_bu_active 
ON ai_agents(bu_id, is_active) 
WHERE is_active = true;

-- App Error Logs: índice para queries por BU
CREATE INDEX IF NOT EXISTS idx_app_error_logs_bu_created 
ON app_error_logs(bu_id, created_at DESC);

-- Cycles: índice para listagem de ciclos por BU e tipo
CREATE INDEX IF NOT EXISTS idx_cycles_bu_type 
ON cycles(bu_id, type);

-- OKR Objective Reviews: índice para BU + objective
CREATE INDEX IF NOT EXISTS idx_okr_objective_reviews_bu_objective 
ON okr_objective_reviews(bu_id, objective_type, objective_id);

-- Ticket Attachments: adicionar índice com bu_id
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_bu_ticket 
ON ticket_attachments(bu_id, ticket_id) 
WHERE deleted_at IS NULL;

-- Ticket Messages: adicionar índice com bu_id
CREATE INDEX IF NOT EXISTS idx_ticket_messages_bu_ticket_created 
ON ticket_messages(bu_id, ticket_id, created_at DESC);

-- Ticket Participants: adicionar índice com bu_id
CREATE INDEX IF NOT EXISTS idx_ticket_participants_bu_ticket 
ON ticket_participants(bu_id, ticket_id);