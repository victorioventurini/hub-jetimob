-- Temporarily disable the bu_scope trigger to allow data fix
ALTER TABLE asset_inventory DISABLE TRIGGER trg_enforce_bu_scope_asset_inventory;

-- Fix quantity_available for all items that have 0 available but quantity_total > 0
UPDATE asset_inventory 
SET quantity_available = quantity_total,
    updated_at = now()
WHERE deleted_at IS NULL 
AND quantity_available = 0 
AND quantity_total > 0;

-- Re-enable the trigger
ALTER TABLE asset_inventory ENABLE TRIGGER trg_enforce_bu_scope_asset_inventory;