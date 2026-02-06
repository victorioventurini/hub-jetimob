-- ============================================
-- Asset Recommendations - Recomendações de Equipamentos
-- TCR v2.93.0 | DATA_MODEL_REGISTRY.md
-- ============================================

-- 1. Nova tabela: asset_recommendations
CREATE TABLE public.asset_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES bu_units(id) ON DELETE CASCADE,
  
  -- Identificação
  name text NOT NULL,
  category_id uuid REFERENCES asset_categories(id),
  brand text NOT NULL,
  model text,
  description text,
  
  -- Aplicabilidade (arrays, padrão Hub igual job_titles.bu_ids[])
  applicable_team_ids uuid[] NOT NULL DEFAULT '{}',
  applicable_job_title_ids uuid[] NOT NULL DEFAULT '{}',
  
  -- Governança
  review_interval_months integer NOT NULL DEFAULT 6 CHECK (review_interval_months IN (3, 6, 12)),
  last_reviewed_at timestamptz,
  owner_user_id uuid NOT NULL REFERENCES profiles(id),
  created_by_user_id uuid REFERENCES profiles(id),
  
  -- Metadados
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Índices para performance
CREATE INDEX idx_asset_recommendations_bu_active 
  ON asset_recommendations(bu_id) 
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX idx_asset_recommendations_owner 
  ON asset_recommendations(owner_user_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_asset_recommendations_teams 
  ON asset_recommendations USING GIN (applicable_team_ids) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_asset_recommendations_job_titles 
  ON asset_recommendations USING GIN (applicable_job_title_ids) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_asset_recommendations_category 
  ON asset_recommendations(category_id) 
  WHERE deleted_at IS NULL;

-- 3. Enable RLS
ALTER TABLE asset_recommendations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- SELECT: Membros da BU podem ver recomendações ativas
CREATE POLICY "recommendations_select_bu" 
  ON asset_recommendations FOR SELECT
  USING (
    is_current_bu(bu_id) 
    AND deleted_at IS NULL
  );

-- INSERT: Usuários que pertencem à BU podem criar
CREATE POLICY "recommendations_insert" 
  ON asset_recommendations FOR INSERT
  WITH CHECK (
    is_current_bu(bu_id)
  );

-- UPDATE: Membros da BU podem atualizar
CREATE POLICY "recommendations_update" 
  ON asset_recommendations FOR UPDATE
  USING (
    is_current_bu(bu_id) 
    AND deleted_at IS NULL
  );

-- 5. Trigger para updated_at (usando função existente)
CREATE TRIGGER set_asset_recommendations_updated_at
  BEFORE UPDATE ON asset_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Coluna em asset_inventory para vincular recomendação
ALTER TABLE public.asset_inventory 
  ADD COLUMN IF NOT EXISTS recommendation_id uuid REFERENCES asset_recommendations(id);

-- 7. Índice para histórico de compras por recomendação
CREATE INDEX IF NOT EXISTS idx_asset_inventory_recommendation 
  ON asset_inventory(recommendation_id) 
  WHERE deleted_at IS NULL AND recommendation_id IS NOT NULL;

-- 8. Comentários para documentação
COMMENT ON TABLE asset_recommendations IS 'Recomendações de equipamentos para orientar compras. Cada recomendação pode ter escopo Global, por Time ou por Cargo.';
COMMENT ON COLUMN asset_recommendations.applicable_team_ids IS 'Times para os quais esta recomendação se aplica. Array vazio = aplicação global ou por cargo.';
COMMENT ON COLUMN asset_recommendations.applicable_job_title_ids IS 'Cargos para os quais esta recomendação se aplica. Cargo > Time > Global.';
COMMENT ON COLUMN asset_recommendations.owner_user_id IS 'Responsável pela revisão periódica da recomendação (mandatory dependency para RTS).';
COMMENT ON COLUMN asset_inventory.recommendation_id IS 'Recomendação de equipamento utilizada para criar este item. Permite herança de valor de referência.';