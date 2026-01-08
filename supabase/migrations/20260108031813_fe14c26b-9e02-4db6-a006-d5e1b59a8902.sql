-- Disable only user triggers (not system)
ALTER TABLE asset_inventory DISABLE TRIGGER USER;
ALTER TABLE asset_categories DISABLE TRIGGER USER;

-- Remove category references from inventory
UPDATE asset_inventory SET category_id = NULL WHERE bu_id = 'a0000000-0000-0000-0000-000000000001';

-- Delete subcategories (those with parent_id)
DELETE FROM asset_categories WHERE bu_id = 'a0000000-0000-0000-0000-000000000001' AND parent_id IS NOT NULL;

-- Delete parent categories
DELETE FROM asset_categories WHERE bu_id = 'a0000000-0000-0000-0000-000000000001';

-- Re-enable user triggers
ALTER TABLE asset_inventory ENABLE TRIGGER USER;
ALTER TABLE asset_categories ENABLE TRIGGER USER;