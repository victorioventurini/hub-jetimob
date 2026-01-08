-- =============================================
-- RLS Policies Part 3: Asset Module
-- =============================================

-- asset_categories
CREATE POLICY "asset_categories_select" ON public.asset_categories
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_categories_admin" ON public.asset_categories
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- asset_clavicularies
CREATE POLICY "asset_clavicularies_select" ON public.asset_clavicularies
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_clavicularies_admin" ON public.asset_clavicularies
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- asset_gift_items
CREATE POLICY "asset_gift_items_select" ON public.asset_gift_items
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_gift_items_admin" ON public.asset_gift_items
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- asset_gift_batches
CREATE POLICY "asset_gift_batches_select" ON public.asset_gift_batches
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_gift_batches_admin" ON public.asset_gift_batches
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- asset_gift_movements
CREATE POLICY "asset_gift_movements_select" ON public.asset_gift_movements
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_gift_movements_insert" ON public.asset_gift_movements
FOR INSERT TO authenticated WITH CHECK (
  public.is_bu_member(auth.uid(), bu_id)
);

-- asset_groups
CREATE POLICY "asset_groups_select" ON public.asset_groups
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_groups_admin" ON public.asset_groups
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- asset_group_items
CREATE POLICY "asset_group_items_select" ON public.asset_group_items
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_group_items_admin" ON public.asset_group_items
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- asset_hooks
CREATE POLICY "asset_hooks_select" ON public.asset_hooks
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.asset_clavicularies c
    WHERE c.id = claviculary_id AND public.is_bu_member(auth.uid(), c.bu_id)
  )
);

CREATE POLICY "asset_hooks_admin" ON public.asset_hooks
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.asset_clavicularies c
    WHERE c.id = claviculary_id AND public.is_bu_admin(auth.uid(), c.bu_id)
  )
);

-- asset_inventory
CREATE POLICY "asset_inventory_select" ON public.asset_inventory
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_inventory_admin" ON public.asset_inventory
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- asset_keyrings
CREATE POLICY "asset_keyrings_select" ON public.asset_keyrings
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_keyrings_admin" ON public.asset_keyrings
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- asset_keys
CREATE POLICY "asset_keys_select" ON public.asset_keys
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_keys_admin" ON public.asset_keys
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);

-- asset_key_movements
CREATE POLICY "asset_key_movements_select" ON public.asset_key_movements
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_key_movements_insert" ON public.asset_key_movements
FOR INSERT TO authenticated WITH CHECK (
  public.is_bu_member(auth.uid(), bu_id)
);

-- asset_movements
CREATE POLICY "asset_movements_select" ON public.asset_movements
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_movements_insert" ON public.asset_movements
FOR INSERT TO authenticated WITH CHECK (
  public.is_bu_member(auth.uid(), bu_id)
);

-- asset_permissions
CREATE POLICY "asset_permissions_select" ON public.asset_permissions
FOR SELECT TO authenticated USING (
  public.is_bu_member(auth.uid(), bu_id)
);

CREATE POLICY "asset_permissions_admin" ON public.asset_permissions
FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  OR public.is_bu_admin(auth.uid(), bu_id)
);