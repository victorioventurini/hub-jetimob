-- =====================================================
-- Wave 1G: Add FKs to tables WITHOUT orphans
-- =====================================================

-- Tabelas sem órfãos (podem adicionar FK diretamente)
ALTER TABLE asset_keys 
  ADD CONSTRAINT fk_asset_keys_created_by 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE asset_permissions 
  ADD CONSTRAINT fk_asset_permissions_created_by 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE asset_groups 
  ADD CONSTRAINT fk_asset_groups_created_by 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE asset_gift_items 
  ADD CONSTRAINT fk_asset_gift_items_created_by 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE asset_gift_batches 
  ADD CONSTRAINT fk_asset_gift_batches_created_by 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;