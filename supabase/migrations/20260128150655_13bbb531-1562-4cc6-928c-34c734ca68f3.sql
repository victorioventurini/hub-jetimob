-- Expandir asset_gift_items com campos estruturados (semelhante ao asset_inventory)
ALTER TABLE asset_gift_items
  ADD COLUMN category_id UUID REFERENCES asset_categories(id),
  ADD COLUMN supplier_id UUID REFERENCES external_companies(id),
  ADD COLUMN home_location_id UUID REFERENCES bu_locations(id),
  ADD COLUMN acquired_at DATE,
  ADD COLUMN acquisition_value NUMERIC(12,2),
  ADD COLUMN quantity_total INTEGER DEFAULT 0;

-- Índices para performance
CREATE INDEX idx_gift_items_category ON asset_gift_items(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gift_items_supplier ON asset_gift_items(supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gift_items_location ON asset_gift_items(home_location_id) WHERE deleted_at IS NULL;

-- Comentários de documentação
COMMENT ON COLUMN asset_gift_items.category_id IS 'FK para asset_categories (subcategoria hierárquica)';
COMMENT ON COLUMN asset_gift_items.supplier_id IS 'FK para external_companies (fornecedor)';
COMMENT ON COLUMN asset_gift_items.home_location_id IS 'FK para bu_locations (localização base)';
COMMENT ON COLUMN asset_gift_items.acquired_at IS 'Data de aquisição do item';
COMMENT ON COLUMN asset_gift_items.acquisition_value IS 'Valor total de aquisição';
COMMENT ON COLUMN asset_gift_items.quantity_total IS 'Quantidade total cadastrada';
COMMENT ON COLUMN asset_gift_items.category IS 'LEGADO: Campo texto livre. Preferir category_id.';