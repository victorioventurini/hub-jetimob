-- =============================================================================
-- FASE 3: Índices Parciais para Soft Delete (corrigido)
-- =============================================================================

-- 4. okr_coaching_events - filtra deleted_at IS NULL (usando created_at)
CREATE INDEX IF NOT EXISTS idx_okr_coaching_events_active 
  ON public.okr_coaching_events (bu_id, created_at) 
  WHERE deleted_at IS NULL;

-- 5. notification_outbox - índice para processamento (status pending)
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending 
  ON public.notification_outbox (created_at) 
  WHERE status = 'pending';