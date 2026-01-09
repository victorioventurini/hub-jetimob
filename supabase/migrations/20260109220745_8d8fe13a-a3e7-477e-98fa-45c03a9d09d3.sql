-- ============================================================
-- IDENTITY CUTOVER v3.0 — FASE 0.5 (Parte 2): Migrar is_bu_member → is_profile_bu_member
-- ============================================================
-- Batch 1: Assets (16 policies)
-- ============================================================

-- asset_categories
DROP POLICY IF EXISTS "asset_categories_select" ON asset_categories;
CREATE POLICY "asset_categories_select" ON asset_categories
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_clavicularies  
DROP POLICY IF EXISTS "asset_clavicularies_select" ON asset_clavicularies;
CREATE POLICY "asset_clavicularies_select" ON asset_clavicularies
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_gift_batches
DROP POLICY IF EXISTS "asset_gift_batches_select" ON asset_gift_batches;
CREATE POLICY "asset_gift_batches_select" ON asset_gift_batches
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_gift_items
DROP POLICY IF EXISTS "asset_gift_items_select" ON asset_gift_items;
CREATE POLICY "asset_gift_items_select" ON asset_gift_items
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_gift_movements (SELECT + INSERT)
DROP POLICY IF EXISTS "asset_gift_movements_select" ON asset_gift_movements;
CREATE POLICY "asset_gift_movements_select" ON asset_gift_movements
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "asset_gift_movements_insert" ON asset_gift_movements;
CREATE POLICY "asset_gift_movements_insert" ON asset_gift_movements
FOR INSERT WITH CHECK (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_group_items
DROP POLICY IF EXISTS "asset_group_items_select" ON asset_group_items;
CREATE POLICY "asset_group_items_select" ON asset_group_items
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_groups
DROP POLICY IF EXISTS "asset_groups_select" ON asset_groups;
CREATE POLICY "asset_groups_select" ON asset_groups
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_hooks (via claviculary join)
DROP POLICY IF EXISTS "asset_hooks_select" ON asset_hooks;
CREATE POLICY "asset_hooks_select" ON asset_hooks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM asset_clavicularies c
    WHERE c.id = asset_hooks.claviculary_id 
      AND is_profile_bu_member(my_profile_id(), c.bu_id)
  )
);

-- asset_inventory
DROP POLICY IF EXISTS "asset_inventory_select" ON asset_inventory;
CREATE POLICY "asset_inventory_select" ON asset_inventory
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_key_movements (SELECT + INSERT)
DROP POLICY IF EXISTS "asset_key_movements_select" ON asset_key_movements;
CREATE POLICY "asset_key_movements_select" ON asset_key_movements
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "asset_key_movements_insert" ON asset_key_movements;
CREATE POLICY "asset_key_movements_insert" ON asset_key_movements
FOR INSERT WITH CHECK (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_keyrings
DROP POLICY IF EXISTS "asset_keyrings_select" ON asset_keyrings;
CREATE POLICY "asset_keyrings_select" ON asset_keyrings
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_keys
DROP POLICY IF EXISTS "asset_keys_select" ON asset_keys;
CREATE POLICY "asset_keys_select" ON asset_keys
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_movements (SELECT + INSERT)
DROP POLICY IF EXISTS "asset_movements_select" ON asset_movements;
CREATE POLICY "asset_movements_select" ON asset_movements
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "asset_movements_insert" ON asset_movements;
CREATE POLICY "asset_movements_insert" ON asset_movements
FOR INSERT WITH CHECK (is_profile_bu_member(my_profile_id(), bu_id));

-- asset_permissions
DROP POLICY IF EXISTS "asset_permissions_select" ON asset_permissions;
CREATE POLICY "asset_permissions_select" ON asset_permissions
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));