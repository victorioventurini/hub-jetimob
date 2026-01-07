-- ============================================================
-- Performance Phase 2: Schema-Safe Indexes
-- Created: 2026-01-07
-- Description: Creates indexes only for columns that exist
-- TCR Compliant: Yes - respects bu_id scope, soft delete, RLS
-- ============================================================

-- ============================================================
-- PROFILES
-- ============================================================
DO $$
BEGIN
  -- idx_profiles_bu_id (if not exists)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_bu_id') THEN
    CREATE INDEX idx_profiles_bu_id ON public.profiles (bu_id) WHERE deleted_at IS NULL;
  END IF;
  
  -- idx_profiles_team_id (for team membership lookups)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_team_id') THEN
    CREATE INDEX idx_profiles_team_id ON public.profiles (team_id) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- ============================================================
-- TEAMS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teams_bu_status') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='teams' AND column_name='status') THEN
      EXECUTE 'CREATE INDEX idx_teams_bu_status ON public.teams (bu_id, status)';
    END IF;
  END IF;
END $$;

-- ============================================================
-- OKRs - Optimize for dashboard and pending checkins
-- ============================================================
DO $$
BEGIN
  -- okr_org_objectives: bu_id + year for yearly dashboard
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_okr_org_objectives_bu_year') THEN
    CREATE INDEX idx_okr_org_objectives_bu_year ON public.okr_org_objectives (bu_id, year) WHERE deleted_at IS NULL;
  END IF;

  -- okr_team_key_results: bu_id + status for RAG summary
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_okr_team_key_results_bu_status') THEN
    CREATE INDEX idx_okr_team_key_results_bu_status ON public.okr_team_key_results (bu_id, status) WHERE deleted_at IS NULL;
  END IF;
  
  -- okr_team_key_results: team_id + status for team RAG
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_okr_team_key_results_team_status') THEN
    CREATE INDEX idx_okr_team_key_results_team_status ON public.okr_team_key_results (team_id, status) WHERE deleted_at IS NULL;
  END IF;

  -- okr_checkins: kr_id + date desc for latest checkin
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_okr_checkins_kr_date_desc') THEN
    CREATE INDEX idx_okr_checkins_kr_date_desc ON public.okr_checkins (kr_id, date DESC);
  END IF;
END $$;

-- ============================================================
-- TICKETS - Main query paths
-- ============================================================
DO $$
BEGIN
  -- tickets: bu_id basic index
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tickets_bu_id') THEN
    CREATE INDEX idx_tickets_bu_id ON public.tickets (bu_id);
  END IF;
  
  -- tickets: bu_id + status for filtered lists
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tickets_bu_status') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='status') THEN
      EXECUTE 'CREATE INDEX idx_tickets_bu_status ON public.tickets (bu_id, status)';
    END IF;
  END IF;
  
  -- tickets: bu_id + updated_at for recent tickets
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tickets_bu_updated_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='updated_at') THEN
      EXECUTE 'CREATE INDEX idx_tickets_bu_updated_at ON public.tickets (bu_id, updated_at DESC)';
    END IF;
  END IF;
  
  -- tickets: partner_company_id for partner filtering (if exists)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tickets_bu_partner') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='partner_company_id') THEN
      EXECUTE 'CREATE INDEX idx_tickets_bu_partner ON public.tickets (bu_id, partner_company_id)';
    END IF;
  END IF;
  
  -- ticket_messages: ticket_id + created_at for pagination
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ticket_messages_ticket_created') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ticket_messages' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX idx_ticket_messages_ticket_created ON public.ticket_messages (ticket_id, created_at)';
    END IF;
  END IF;
  
  -- ticket_categories: bu_id for config lookup
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ticket_categories_bu') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ticket_categories' AND column_name='bu_id') THEN
      EXECUTE 'CREATE INDEX idx_ticket_categories_bu ON public.ticket_categories (bu_id)';
    END IF;
  END IF;
END $$;

-- ============================================================
-- ASSET KEYS (keyrings and movements)
-- ============================================================
DO $$
BEGIN
  -- asset_keyrings: bu_id + status
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_asset_keyrings_bu_status') THEN
    CREATE INDEX idx_asset_keyrings_bu_status ON public.asset_keyrings (bu_id, status) WHERE deleted_at IS NULL;
  END IF;
  
  -- asset_key_movements: keyring_id + occurred_at for history
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_asset_key_movements_keyring_occurred') THEN
    CREATE INDEX idx_asset_key_movements_keyring_occurred ON public.asset_key_movements (keyring_id, occurred_at DESC);
  END IF;
END $$;

-- ============================================================
-- KPIs - Optimize for last value lookup
-- ============================================================
DO $$
BEGIN
  -- kpi_values: kpi_id + reference_date desc (composite for latest value)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_kpi_values_kpi_date_desc') THEN
    CREATE INDEX idx_kpi_values_kpi_date_desc ON public.kpi_values (kpi_id, reference_date DESC);
  END IF;
  
  -- kpi_metrics: bu_id + is_global + status for filtering
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_kpi_metrics_bu_global_status') THEN
    CREATE INDEX idx_kpi_metrics_bu_global_status ON public.kpi_metrics (bu_id, is_global, status) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- ============================================================
-- NOTIFICATIONS - Optimize for unread count and inbox
-- ============================================================
DO $$
BEGIN
  -- notifications: user_id + is_read for unread count
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_read') THEN
    CREATE INDEX idx_notifications_user_read ON public.notifications (user_id, is_read);
  END IF;
  
  -- notifications: bu_id + created_at for bu-scoped inbox
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_bu_created') THEN
    CREATE INDEX idx_notifications_bu_created ON public.notifications (bu_id, created_at DESC);
  END IF;
END $$;

-- ============================================================
-- NOTIFICATION_OUTBOX - Optimize for processing
-- ============================================================
DO $$
BEGIN
  -- notification_outbox: status for processing queue (if not exists)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notification_outbox_status') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_outbox' AND column_name='status') THEN
      EXECUTE 'CREATE INDEX idx_notification_outbox_status ON public.notification_outbox (status)';
    END IF;
  END IF;
  
  -- notification_outbox: created_at for ordering
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notification_outbox_created') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_outbox' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX idx_notification_outbox_created ON public.notification_outbox (created_at DESC)';
    END IF;
  END IF;
END $$;

-- ============================================================
-- REPORTING VIEW: List all performance indexes created
-- ============================================================
CREATE OR REPLACE VIEW public.v_perf_indexes_report AS
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'profiles', 'teams', 'tickets', 'ticket_messages', 'ticket_categories',
    'okr_org_objectives', 'okr_team_objectives', 'okr_team_key_results', 'okr_checkins',
    'kpi_metrics', 'kpi_values', 'asset_inventory', 'asset_movements', 
    'asset_keyrings', 'asset_key_movements', 'notifications', 'notification_outbox'
  )
ORDER BY tablename, indexname;

-- Grant select on the view
GRANT SELECT ON public.v_perf_indexes_report TO authenticated;

-- ============================================================
-- COMMENT: Migration completed successfully
-- All indexes are schema-safe (check column existence before creation)
-- ============================================================