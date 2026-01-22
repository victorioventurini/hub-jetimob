
-- ============================================================
-- Índices Parciais para Soft-Delete (P2 - Performance)
-- Índices restantes após correções de schema
-- ============================================================

-- 6. ticket_routing_rules (bu_id + subcategory_id em vez de priority)
CREATE INDEX IF NOT EXISTS idx_ticket_routing_rules_bu_active 
ON public.ticket_routing_rules (bu_id, subcategory_id) 
WHERE deleted_at IS NULL;

-- 7. ticket_subcategories
CREATE INDEX IF NOT EXISTS idx_ticket_subcategories_category_active 
ON public.ticket_subcategories (category_id, name) 
WHERE deleted_at IS NULL;

-- Comentários
COMMENT ON INDEX idx_ticket_routing_rules_bu_active IS 'Partial index for active routing rules by BU and subcategory';
COMMENT ON INDEX idx_ticket_subcategories_category_active IS 'Partial index for active subcategories';
