-- ============================================================
-- TICKET INTERNAL ROUTING RULES - Migração completa
-- Roteamento automático de tickets internos por categoria/subcategoria
-- ============================================================

-- Tabela de regras de roteamento interno
CREATE TABLE IF NOT EXISTS public.ticket_internal_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES bu_units(id) ON DELETE CASCADE,
  
  -- Escopo: categoria ou subcategoria (mutuamente exclusivos)
  category_id UUID REFERENCES ticket_categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES ticket_subcategories(id) ON DELETE CASCADE,
  
  -- Destinos - Responsáveis (podem ser combinados)
  assignee_user_ids UUID[] DEFAULT '{}',
  assignee_team_ids UUID[] DEFAULT '{}',
  assignee_squad_ids UUID[] DEFAULT '{}',
  
  -- Destinos - Observadores (podem ser combinados)
  watcher_user_ids UUID[] DEFAULT '{}',
  watcher_team_ids UUID[] DEFAULT '{}',
  watcher_squad_ids UUID[] DEFAULT '{}',
  
  -- Prioridade para resolver conflitos (menor = mais prioritário)
  priority INTEGER NOT NULL DEFAULT 100,
  
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraint: deve ter category_id OU subcategory_id, não ambos
  CONSTRAINT chk_internal_routing_category_xor_subcategory 
    CHECK (
      (category_id IS NOT NULL AND subcategory_id IS NULL) OR 
      (category_id IS NULL AND subcategory_id IS NOT NULL)
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_internal_routing_bu_id 
  ON ticket_internal_routing_rules(bu_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_internal_routing_category_id 
  ON ticket_internal_routing_rules(category_id) 
  WHERE deleted_at IS NULL AND category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_internal_routing_subcategory_id 
  ON ticket_internal_routing_rules(subcategory_id) 
  WHERE deleted_at IS NULL AND subcategory_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_internal_routing_priority 
  ON ticket_internal_routing_rules(priority) 
  WHERE deleted_at IS NULL;

-- Comentários
COMMENT ON TABLE ticket_internal_routing_rules IS 'Regras de roteamento automático para tickets internos baseado em categoria/subcategoria';

-- RLS
ALTER TABLE ticket_internal_routing_rules ENABLE ROW LEVEL SECURITY;

-- Drop policies se existirem para recriar
DROP POLICY IF EXISTS "BU members can view internal routing rules" ON ticket_internal_routing_rules;
DROP POLICY IF EXISTS "Users with permission can create internal routing rules" ON ticket_internal_routing_rules;
DROP POLICY IF EXISTS "Users with permission can update internal routing rules" ON ticket_internal_routing_rules;
DROP POLICY IF EXISTS "Users with permission can delete internal routing rules" ON ticket_internal_routing_rules;

-- Visualização: membros da BU podem ver
CREATE POLICY "BU members can view internal routing rules"
  ON ticket_internal_routing_rules
  FOR SELECT
  USING (bu_id = current_bu_id());

-- Insert: usuários com permissão podem criar
CREATE POLICY "Users with permission can create internal routing rules"
  ON ticket_internal_routing_rules
  FOR INSERT
  WITH CHECK (
    bu_id = current_bu_id() 
    AND has_permission(auth.uid(), current_bu_id(), 'tickets.internal_routing.manage')
  );

-- Update: usuários com permissão podem atualizar
CREATE POLICY "Users with permission can update internal routing rules"
  ON ticket_internal_routing_rules
  FOR UPDATE
  USING (
    bu_id = current_bu_id() 
    AND has_permission(auth.uid(), current_bu_id(), 'tickets.internal_routing.manage')
  );

-- Delete: usuários com permissão podem deletar
CREATE POLICY "Users with permission can delete internal routing rules"
  ON ticket_internal_routing_rules
  FOR DELETE
  USING (
    bu_id = current_bu_id() 
    AND has_permission(auth.uid(), current_bu_id(), 'tickets.internal_routing.manage')
  );

-- Triggers
DROP TRIGGER IF EXISTS trg_enforce_bu_scope_internal_routing ON ticket_internal_routing_rules;
CREATE TRIGGER trg_enforce_bu_scope_internal_routing
  BEFORE INSERT OR UPDATE ON ticket_internal_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION enforce_bu_scope();

DROP TRIGGER IF EXISTS trg_update_timestamp_internal_routing ON ticket_internal_routing_rules;
CREATE TRIGGER trg_update_timestamp_internal_routing
  BEFORE UPDATE ON ticket_internal_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();