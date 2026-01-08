
-- Corrigir registros legados em Assets que armazenam auth.users.id em vez de profiles.id
-- Desabilitar temporariamente apenas os triggers de enforce_bu_scope (user-defined)

-- Desabilitar triggers específicos temporariamente
ALTER TABLE asset_inventory DISABLE TRIGGER trg_enforce_bu_scope_asset_inventory;
ALTER TABLE asset_movements DISABLE TRIGGER trg_enforce_bu_scope_asset_movements;

-- 1. Corrigir asset_inventory.current_user_id
-- MacBook Air: dcb85e6f-7d50-4390-b815-5790429f1be6 (auth.users.id) -> f375b494-5edf-463e-97c1-c39206692759 (profiles.id)
UPDATE asset_inventory 
SET current_user_id = 'f375b494-5edf-463e-97c1-c39206692759',
    updated_at = now()
WHERE id = 'fe268a06-a1a7-42d8-a720-acf0a85278ed'
  AND current_user_id = 'dcb85e6f-7d50-4390-b815-5790429f1be6';

-- 2. Corrigir asset_movements.to_user_id
-- Checkout movement: dcb85e6f-7d50-4390-b815-5790429f1be6 (auth.users.id) -> f375b494-5edf-463e-97c1-c39206692759 (profiles.id)
UPDATE asset_movements 
SET to_user_id = 'f375b494-5edf-463e-97c1-c39206692759'
WHERE id = 'eeab3f79-6158-458d-a74b-0fe58f1af3cb'
  AND to_user_id = 'dcb85e6f-7d50-4390-b815-5790429f1be6';

-- Reabilitar triggers
ALTER TABLE asset_inventory ENABLE TRIGGER trg_enforce_bu_scope_asset_inventory;
ALTER TABLE asset_movements ENABLE TRIGGER trg_enforce_bu_scope_asset_movements;
