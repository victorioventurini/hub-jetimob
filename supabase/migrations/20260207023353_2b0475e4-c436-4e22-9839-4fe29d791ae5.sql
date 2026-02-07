-- ============================================================
-- HYGIENE MIGRATION: Remove deprecated functions + Add indexes
-- Hub da Jet - 2026-02-07
-- ============================================================

-- 1. Remove deprecated cleanup functions (replaced by cleanup_old_logs())
DROP FUNCTION IF EXISTS public.cleanup_old_agent_logs();
DROP FUNCTION IF EXISTS public.cleanup_old_cron_logs();
DROP FUNCTION IF EXISTS public.cleanup_old_perf_snapshots();
DROP FUNCTION IF EXISTS public.cleanup_old_wizard_sessions();

-- 2. Create index on okr_audit_log.created_at for temporal queries
CREATE INDEX IF NOT EXISTS idx_okr_audit_log_created_at 
ON public.okr_audit_log (created_at DESC);

-- 3. Create partial index for soft-delete on asset_inventory (performance)
CREATE INDEX IF NOT EXISTS idx_asset_inventory_active 
ON public.asset_inventory (bu_id, status) 
WHERE deleted_at IS NULL;

-- 4. Create index on notifications.created_at for ordering
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications (created_at DESC);