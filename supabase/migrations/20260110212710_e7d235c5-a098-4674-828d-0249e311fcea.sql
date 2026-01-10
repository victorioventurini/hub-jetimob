-- P2.3: Composite indexes for paginated queries
-- Based on EXPLAIN ANALYZE evidence from real workloads

-- 1. asset_inventory: Add composite index for bu_id + name ordering (paginação)
-- Query pattern: WHERE bu_id = ? AND deleted_at IS NULL ORDER BY name
-- Current: Seq Scan (20ms @ 407 rows)
CREATE INDEX IF NOT EXISTS idx_asset_inventory_bu_name 
ON public.asset_inventory (bu_id, name) 
WHERE deleted_at IS NULL;

-- 2. profiles: Add composite index for bu_id + display_name ordering (paginação)
-- Query pattern: WHERE bu_id = ? AND deleted_at IS NULL ORDER BY display_name
-- Current: Seq Scan (even with idx_profiles_bu_id)
CREATE INDEX IF NOT EXISTS idx_profiles_bu_display_name 
ON public.profiles (bu_id, display_name) 
WHERE deleted_at IS NULL;

-- 3. okr_org_objectives: Add composite index for bu_id + created_at DESC
-- Query pattern: WHERE bu_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
-- Current: Seq Scan (small table but will grow)
CREATE INDEX IF NOT EXISTS idx_okr_org_objectives_bu_created 
ON public.okr_org_objectives (bu_id, created_at DESC) 
WHERE deleted_at IS NULL;