
-- ============================================
-- Migration: Update Assets RLS to V2 Permission System
-- ============================================
-- This migration replaces the old role-based RLS policies with V2 permission key-based policies.
-- The has_permission(profile_id, bu_id, permission_key) function already exists and handles:
--   1. Super admin bypass (returns true)
--   2. BU admin bypass (returns true)
--   3. V1 permission groups (legacy)
--   4. V2 templates (current system)

-- Helper note: We use my_profile_id() for SELECT policies (read) and need profile_id for writes
-- The has_permission function expects profile_id, not auth.uid()

-- ============================================
-- 1. ASSET_INVENTORY - Core inventory table
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS asset_inventory_admin ON public.asset_inventory;
DROP POLICY IF EXISTS asset_inventory_select ON public.asset_inventory;

-- SELECT: Users with assets.inventory.read:bu OR assets.inventory.view:bu
CREATE POLICY "asset_inventory_select_v2" ON public.asset_inventory
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id) 
  AND (
    has_permission(my_profile_id(), bu_id, 'assets.inventory.read:bu')
    OR has_permission(my_profile_id(), bu_id, 'assets.inventory.view:bu')
  )
);

-- INSERT: Users with assets.inventory.create:bu
CREATE POLICY "asset_inventory_insert_v2" ON public.asset_inventory
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.inventory.create:bu')
);

-- UPDATE: Users with assets.inventory.update:bu
CREATE POLICY "asset_inventory_update_v2" ON public.asset_inventory
FOR UPDATE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.inventory.update:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.inventory.update:bu')
);

-- DELETE: Users with assets.inventory.delete:bu
CREATE POLICY "asset_inventory_delete_v2" ON public.asset_inventory
FOR DELETE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.inventory.delete:bu')
);

-- ============================================
-- 2. ASSET_MOVEMENTS - Inventory movements
-- ============================================

DROP POLICY IF EXISTS asset_movements_insert ON public.asset_movements;
DROP POLICY IF EXISTS asset_movements_select ON public.asset_movements;

-- SELECT: Same as inventory view
CREATE POLICY "asset_movements_select_v2" ON public.asset_movements
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.inventory.view:bu')
);

-- INSERT: Users with movement.create permission
CREATE POLICY "asset_movements_insert_v2" ON public.asset_movements
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.inventory.movement.create:bu')
);

-- ============================================
-- 3. ASSET_CATEGORIES - Inventory categories
-- ============================================

DROP POLICY IF EXISTS asset_categories_admin ON public.asset_categories;
DROP POLICY IF EXISTS asset_categories_select ON public.asset_categories;

-- SELECT: Anyone with inventory view can see categories
CREATE POLICY "asset_categories_select_v2" ON public.asset_categories
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.inventory.view:bu')
);

-- INSERT/UPDATE/DELETE: Only with categories.manage
CREATE POLICY "asset_categories_manage_v2" ON public.asset_categories
FOR ALL TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.categories.manage:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.categories.manage:bu')
);

-- ============================================
-- 4. ASSET_GROUPS & ASSET_GROUP_ITEMS - Kits
-- ============================================

DROP POLICY IF EXISTS asset_groups_admin ON public.asset_groups;
DROP POLICY IF EXISTS asset_groups_select ON public.asset_groups;
DROP POLICY IF EXISTS asset_group_items_admin ON public.asset_group_items;
DROP POLICY IF EXISTS asset_group_items_select ON public.asset_group_items;

-- SELECT groups
CREATE POLICY "asset_groups_select_v2" ON public.asset_groups
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.inventory.view:bu')
);

-- Manage groups (requires inventory update)
CREATE POLICY "asset_groups_manage_v2" ON public.asset_groups
FOR ALL TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.inventory.update:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.inventory.update:bu')
);

-- SELECT group items
CREATE POLICY "asset_group_items_select_v2" ON public.asset_group_items
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.inventory.view:bu')
);

-- Manage group items
CREATE POLICY "asset_group_items_manage_v2" ON public.asset_group_items
FOR ALL TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.inventory.update:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.inventory.update:bu')
);

-- ============================================
-- 5. ASSET_KEYRINGS - Key rings management
-- ============================================

DROP POLICY IF EXISTS asset_keyrings_admin ON public.asset_keyrings;
DROP POLICY IF EXISTS asset_keyrings_select ON public.asset_keyrings;

CREATE POLICY "asset_keyrings_select_v2" ON public.asset_keyrings
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.keys.view:bu')
);

CREATE POLICY "asset_keyrings_manage_v2" ON public.asset_keyrings
FOR ALL TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.keys.update:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.keys.update:bu')
);

-- ============================================
-- 6. ASSET_KEYS - Individual keys
-- ============================================

DROP POLICY IF EXISTS asset_keys_admin ON public.asset_keys;
DROP POLICY IF EXISTS asset_keys_select ON public.asset_keys;

CREATE POLICY "asset_keys_select_v2" ON public.asset_keys
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.keys.view:bu')
);

CREATE POLICY "asset_keys_insert_v2" ON public.asset_keys
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.keys.create:bu')
);

CREATE POLICY "asset_keys_update_v2" ON public.asset_keys
FOR UPDATE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.keys.update:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.keys.update:bu')
);

CREATE POLICY "asset_keys_delete_v2" ON public.asset_keys
FOR DELETE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.keys.delete:bu')
);

-- ============================================
-- 7. ASSET_KEY_MOVEMENTS - Key movements
-- ============================================

DROP POLICY IF EXISTS asset_key_movements_insert ON public.asset_key_movements;
DROP POLICY IF EXISTS asset_key_movements_select ON public.asset_key_movements;

CREATE POLICY "asset_key_movements_select_v2" ON public.asset_key_movements
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.keys.view:bu')
);

CREATE POLICY "asset_key_movements_insert_v2" ON public.asset_key_movements
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.keys.checkout:bu')
  OR has_permission(my_profile_id(), bu_id, 'assets.keys.return:bu')
);

-- ============================================
-- 8. ASSET_CLAVICULARIES - Key cabinets
-- ============================================

DROP POLICY IF EXISTS asset_clavicularies_admin ON public.asset_clavicularies;
DROP POLICY IF EXISTS asset_clavicularies_select ON public.asset_clavicularies;

CREATE POLICY "asset_clavicularies_select_v2" ON public.asset_clavicularies
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.keys.view:bu')
);

CREATE POLICY "asset_clavicularies_manage_v2" ON public.asset_clavicularies
FOR ALL TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.keys.settings.manage:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.keys.settings.manage:bu')
);

-- ============================================
-- 9. ASSET_HOOKS - Key hooks in clavicularies
-- ============================================

DROP POLICY IF EXISTS asset_hooks_admin ON public.asset_hooks;
DROP POLICY IF EXISTS asset_hooks_select ON public.asset_hooks;

-- Hooks need to join with clavicularies for bu_id
CREATE POLICY "asset_hooks_select_v2" ON public.asset_hooks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM asset_clavicularies c
    WHERE c.id = asset_hooks.claviculary_id
    AND is_profile_bu_member(my_profile_id(), c.bu_id)
    AND has_permission(my_profile_id(), c.bu_id, 'assets.keys.view:bu')
  )
);

CREATE POLICY "asset_hooks_manage_v2" ON public.asset_hooks
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM asset_clavicularies c
    WHERE c.id = asset_hooks.claviculary_id
    AND has_permission(my_profile_id(), c.bu_id, 'assets.keys.settings.manage:bu')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM asset_clavicularies c
    WHERE c.id = asset_hooks.claviculary_id
    AND has_permission(my_profile_id(), c.bu_id, 'assets.keys.settings.manage:bu')
  )
);

-- ============================================
-- 10. ASSET_GIFT_ITEMS - Gift items catalog
-- ============================================

DROP POLICY IF EXISTS asset_gift_items_admin ON public.asset_gift_items;
DROP POLICY IF EXISTS asset_gift_items_select ON public.asset_gift_items;

CREATE POLICY "asset_gift_items_select_v2" ON public.asset_gift_items
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.gifts.view:bu')
);

CREATE POLICY "asset_gift_items_insert_v2" ON public.asset_gift_items
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.gifts.create:bu')
);

CREATE POLICY "asset_gift_items_update_v2" ON public.asset_gift_items
FOR UPDATE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.gifts.update:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.gifts.update:bu')
);

CREATE POLICY "asset_gift_items_delete_v2" ON public.asset_gift_items
FOR DELETE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.gifts.delete:bu')
);

-- ============================================
-- 11. ASSET_GIFT_BATCHES - Gift batches/lots
-- ============================================

DROP POLICY IF EXISTS asset_gift_batches_admin ON public.asset_gift_batches;
DROP POLICY IF EXISTS asset_gift_batches_select ON public.asset_gift_batches;

CREATE POLICY "asset_gift_batches_select_v2" ON public.asset_gift_batches
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.gifts.view:bu')
);

CREATE POLICY "asset_gift_batches_manage_v2" ON public.asset_gift_batches
FOR ALL TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.gifts.batch.manage:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.gifts.batch.manage:bu')
);

-- ============================================
-- 12. ASSET_GIFT_MOVEMENTS - Gift movements
-- ============================================

DROP POLICY IF EXISTS asset_gift_movements_insert ON public.asset_gift_movements;
DROP POLICY IF EXISTS asset_gift_movements_select ON public.asset_gift_movements;

CREATE POLICY "asset_gift_movements_select_v2" ON public.asset_gift_movements
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'assets.gifts.view:bu')
);

CREATE POLICY "asset_gift_movements_insert_v2" ON public.asset_gift_movements
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.gifts.movement.create:bu')
);

-- ============================================
-- 13. ASSET_PERMISSIONS - Legacy permissions table (keep for migration period)
-- ============================================

DROP POLICY IF EXISTS asset_permissions_admin ON public.asset_permissions;
DROP POLICY IF EXISTS asset_permissions_select ON public.asset_permissions;

-- Only super admins/BU admins can manage this legacy table
CREATE POLICY "asset_permissions_select_v2" ON public.asset_permissions
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
);

CREATE POLICY "asset_permissions_manage_v2" ON public.asset_permissions
FOR ALL TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'assets.settings.manage:bu')
  OR is_bu_admin(auth.uid(), bu_id)
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'assets.settings.manage:bu')
  OR is_bu_admin(auth.uid(), bu_id)
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);
