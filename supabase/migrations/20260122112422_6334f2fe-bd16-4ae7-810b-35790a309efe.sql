
-- ============================================================
-- Índices Parciais para Soft-Delete - Tabelas Restantes
-- ============================================================

-- 1. partner_company_bu_associations (não tem partial index ainda)
CREATE INDEX IF NOT EXISTS idx_partner_company_bu_assoc_active 
ON public.partner_company_bu_associations (bu_id, partner_company_id) 
WHERE deleted_at IS NULL;

-- 2. squad_memberships (não tem partial index ainda)
CREATE INDEX IF NOT EXISTS idx_squad_memberships_active 
ON public.squad_memberships (squad_id, user_id) 
WHERE deleted_at IS NULL;

-- 3. squads (não tem partial index ainda)
CREATE INDEX IF NOT EXISTS idx_squads_bu_active 
ON public.squads (bu_id, name) 
WHERE deleted_at IS NULL;

-- 4. ticket_categories (não tem partial index ainda)
CREATE INDEX IF NOT EXISTS idx_ticket_categories_bu_active 
ON public.ticket_categories (bu_id, name) 
WHERE deleted_at IS NULL;

-- 5. ticket_messages (não tem partial index com deleted_at)
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_active 
ON public.ticket_messages (ticket_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Comentários
COMMENT ON INDEX idx_partner_company_bu_assoc_active IS 'Partial index for active partner associations';
COMMENT ON INDEX idx_squad_memberships_active IS 'Partial index for active squad memberships';
COMMENT ON INDEX idx_squads_bu_active IS 'Partial index for active squads by BU';
COMMENT ON INDEX idx_ticket_categories_bu_active IS 'Partial index for active ticket categories';
COMMENT ON INDEX idx_ticket_messages_ticket_active IS 'Partial index for active ticket messages ordered by date';
