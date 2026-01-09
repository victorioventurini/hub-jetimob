-- ============================================================
-- PHASE 4: OBSERVABILIDADE & GOVERNANÇA (FILTER+CAST FIXED)
-- ============================================================

-- 1. Add sent_at column to notification_outbox
ALTER TABLE public.notification_outbox 
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- 2. Performance indexes for SLO views
CREATE INDEX IF NOT EXISTS idx_outbox_bu_created 
  ON public.notification_outbox (bu_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_bu_channel_status 
  ON public.notification_outbox (bu_id, channel_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_event_created 
  ON public.notification_outbox (event_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_status_created 
  ON public.notification_outbox (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_sent_at 
  ON public.notification_outbox (sent_at) WHERE sent_at IS NOT NULL;

-- 3. Create notification_health_alerts table
CREATE TABLE IF NOT EXISTS public.notification_health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  cooldown_minutes integer NOT NULL DEFAULT 60,
  escalation_level text NOT NULL DEFAULT 'warning',
  consecutive_occurrences integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_health_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_health_alerts_select" ON public.notification_health_alerts;
CREATE POLICY "notification_health_alerts_select" ON public.notification_health_alerts
  FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()) OR bu_id IN (
    SELECT bu_id FROM public.bu_user_memberships WHERE user_id = auth.uid() AND role_in_bu IN ('admin', 'super_admin')
  ));

DROP INDEX IF EXISTS idx_unique_active_alert_per_bu_type;
CREATE UNIQUE INDEX idx_unique_active_alert_per_bu_type 
  ON public.notification_health_alerts (bu_id, alert_type) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_health_alerts_active 
  ON public.notification_health_alerts (bu_id, is_active, detected_at DESC);

-- 4. Create alert actions table
CREATE TABLE IF NOT EXISTS public.notification_health_alert_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.notification_health_alerts(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_profile_id uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_health_alert_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_actions_select" ON public.notification_health_alert_actions;
CREATE POLICY "alert_actions_select" ON public.notification_health_alert_actions
  FOR SELECT TO authenticated USING (alert_id IN (
    SELECT id FROM public.notification_health_alerts WHERE is_platform_admin(auth.uid()) 
    OR bu_id IN (SELECT bu_id FROM public.bu_user_memberships WHERE user_id = auth.uid() AND role_in_bu IN ('admin', 'super_admin'))
  ));

DROP POLICY IF EXISTS "alert_actions_insert" ON public.notification_health_alert_actions;
CREATE POLICY "alert_actions_insert" ON public.notification_health_alert_actions
  FOR INSERT TO authenticated WITH CHECK (alert_id IN (
    SELECT id FROM public.notification_health_alerts WHERE is_platform_admin(auth.uid()) 
    OR bu_id IN (SELECT bu_id FROM public.bu_user_memberships WHERE user_id = auth.uid() AND role_in_bu IN ('admin', 'super_admin'))
  ));

-- 5. Create runbooks table
CREATE TABLE IF NOT EXISTS public.notification_health_runbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text UNIQUE NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  markdown_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.notification_health_runbooks (alert_type, severity, markdown_content)
VALUES 
  ('outbox_backlog', 'warning', '## Fila Acumulada

### O que significa
Notificações pendentes acima do limite.

### Ação
1. Verificar processador de outbox
2. Checar canais externos'),
  ('high_failure_rate', 'critical', '## Alta Taxa de Falhas

### O que significa
Canal falhando >10%.

### Ação
1. Verificar credenciais
2. Testar envio manual'),
  ('channel_down', 'critical', '## Canal Fora

### O que significa
5+ falhas consecutivas.

### Ação
1. Verificar serviço externo
2. Validar configuração'),
  ('event_disabled_mandatory', 'warning', '## Evento Obrigatório Desabilitado

### O que significa
Evento mandatory foi desativado.

### Ação
Reativar se necessário')
ON CONFLICT (alert_type) DO NOTHING;

-- 6. Add permission keys
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, created_at)
VALUES 
  ('notifications.slo.read:bu', 'notifications', 'slo', 'read', 'bu', 'Visualizar métricas SLO', now()),
  ('notifications.slo.admin:bu', 'notifications', 'slo', 'admin', 'bu', 'Administrar SLO', now()),
  ('notifications.health.ack:bu', 'notifications', 'health', 'ack', 'bu', 'Reconhecer alertas', now())
ON CONFLICT (key) DO NOTHING;

-- 7. SLO View: By Channel Daily (FILTER+CAST FIXED)
DROP VIEW IF EXISTS public.v_notification_slo_by_channel_daily;
CREATE VIEW public.v_notification_slo_by_channel_daily WITH (security_invoker = true) AS
SELECT 
  o.bu_id,
  o.channel_slug,
  date_trunc('day', o.created_at) AS day,
  COUNT(*) AS total,
  (COUNT(*) FILTER (WHERE o.status = 'sent'))::bigint AS total_success,
  (COUNT(*) FILTER (WHERE o.status = 'failed'))::bigint AS total_failed,
  (COUNT(*) FILTER (WHERE o.status = 'pending'))::bigint AS pending_count,
  ROUND(
    COALESCE(
      (COUNT(*) FILTER (WHERE o.status = 'sent'))::numeric * 100 
      / NULLIF(COUNT(*)::numeric, 0),
      0
    ), 2
  ) AS success_rate,
  ROUND(
    COALESCE(
      (AVG(EXTRACT(EPOCH FROM (o.sent_at - o.created_at)) * 1000) FILTER (WHERE o.sent_at IS NOT NULL))::numeric,
      0
    ), 2
  ) AS avg_delivery_time_ms
FROM public.notification_outbox o
WHERE o.created_at >= now() - interval '30 days'
GROUP BY o.bu_id, o.channel_slug, date_trunc('day', o.created_at);

-- 8. SLO View: By Event Daily
DROP VIEW IF EXISTS public.v_notification_slo_by_event_daily;
CREATE VIEW public.v_notification_slo_by_event_daily WITH (security_invoker = true) AS
SELECT 
  o.bu_id,
  o.event_slug,
  date_trunc('day', o.created_at) AS day,
  COUNT(*) AS total,
  (COUNT(*) FILTER (WHERE o.status = 'sent'))::bigint AS total_success,
  (COUNT(*) FILTER (WHERE o.status = 'failed'))::bigint AS total_failed,
  ROUND(
    COALESCE(
      (COUNT(*) FILTER (WHERE o.status = 'sent'))::numeric * 100 
      / NULLIF(COUNT(*)::numeric, 0),
      0
    ), 2
  ) AS success_rate
FROM public.notification_outbox o
WHERE o.created_at >= now() - interval '30 days'
GROUP BY o.bu_id, o.event_slug, date_trunc('day', o.created_at);

-- 9. SLO View: Summary 7 days
DROP VIEW IF EXISTS public.v_notification_slo_summary_7d;
CREATE VIEW public.v_notification_slo_summary_7d WITH (security_invoker = true) AS
SELECT 
  o.bu_id,
  o.channel_slug,
  COUNT(*) AS total,
  (COUNT(*) FILTER (WHERE o.status = 'sent'))::bigint AS total_success,
  (COUNT(*) FILTER (WHERE o.status = 'failed'))::bigint AS total_failed,
  (COUNT(*) FILTER (WHERE o.status = 'pending'))::bigint AS pending_count,
  ROUND(
    COALESCE(
      (COUNT(*) FILTER (WHERE o.status = 'sent'))::numeric * 100 
      / NULLIF(COUNT(*)::numeric, 0),
      0
    ), 2
  ) AS success_rate,
  ROUND(
    COALESCE(
      (AVG(EXTRACT(EPOCH FROM (o.sent_at - o.created_at)) * 1000) FILTER (WHERE o.sent_at IS NOT NULL))::numeric,
      0
    ), 2
  ) AS avg_delivery_time_ms,
  CASE 
    WHEN COUNT(*) > 0 
      AND (COUNT(*) FILTER (WHERE o.status = 'sent'))::numeric / NULLIF(COUNT(*)::numeric, 0) >= 0.99 
    THEN true 
    ELSE false 
  END AS slo_compliant
FROM public.notification_outbox o
WHERE o.created_at >= now() - interval '7 days'
GROUP BY o.bu_id, o.channel_slug;

-- 10. Evaluate health function with cooldown/escalation
CREATE OR REPLACE FUNCTION public.evaluate_notification_health()
RETURNS TABLE (alerts_created integer, alerts_resolved integer, details jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_created integer := 0;
  v_resolved integer := 0;
  v_bu record;
  v_alert record;
  v_existing record;
  v_threshold integer := 3;
BEGIN
  FOR v_bu IN SELECT id FROM bu_units WHERE status = 'active' LOOP
    -- Check outbox backlog
    FOR v_alert IN 
      SELECT v_bu.id AS bu_id, 'outbox_backlog' AS alert_type, 'warning' AS severity,
        jsonb_build_object(
          'pending_count', COUNT(*), 
          'oldest_minutes', ROUND((EXTRACT(EPOCH FROM (now() - MIN(created_at)))/60)::numeric, 1)
        ) AS metadata
      FROM notification_outbox 
      WHERE bu_id = v_bu.id AND status = 'pending' AND created_at < now() - interval '10 minutes'
      HAVING COUNT(*) > 50
    LOOP
      SELECT * INTO v_existing FROM notification_health_alerts 
      WHERE bu_id = v_alert.bu_id AND alert_type = v_alert.alert_type AND is_active = true;
      
      IF v_existing IS NULL THEN
        INSERT INTO notification_health_alerts (bu_id, alert_type, severity, metadata, cooldown_minutes, escalation_level)
        VALUES (v_alert.bu_id, v_alert.alert_type, v_alert.severity, v_alert.metadata, 60, 'warning');
        v_created := v_created + 1;
      ELSE
        UPDATE notification_health_alerts SET 
          metadata = v_alert.metadata, 
          consecutive_occurrences = consecutive_occurrences + 1,
          escalation_level = CASE WHEN consecutive_occurrences + 1 >= v_threshold THEN 'critical' ELSE escalation_level END,
          severity = CASE WHEN consecutive_occurrences + 1 >= v_threshold THEN 'critical' ELSE severity END,
          cooldown_minutes = CASE WHEN consecutive_occurrences + 1 >= v_threshold THEN 10 ELSE cooldown_minutes END,
          updated_at = now()
        WHERE id = v_existing.id;
      END IF;
    END LOOP;
    
    -- Check high failure rate by channel
    FOR v_alert IN 
      SELECT v_bu.id AS bu_id, 'high_failure_rate' AS alert_type, 'critical' AS severity,
        jsonb_build_object(
          'channel_slug', channel_slug,
          'failure_rate_pct', ROUND(((COUNT(*) FILTER (WHERE status = 'failed'))::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2),
          'failed_count', COUNT(*) FILTER (WHERE status = 'failed'),
          'total_count', COUNT(*)
        ) AS metadata
      FROM notification_outbox
      WHERE bu_id = v_bu.id AND created_at >= now() - interval '15 minutes'
      GROUP BY channel_slug
      HAVING COUNT(*) > 10 AND ((COUNT(*) FILTER (WHERE status = 'failed'))::numeric / NULLIF(COUNT(*)::numeric, 0)) > 0.10
    LOOP
      SELECT * INTO v_existing FROM notification_health_alerts 
      WHERE bu_id = v_alert.bu_id AND alert_type = v_alert.alert_type AND is_active = true
        AND metadata->>'channel_slug' = v_alert.metadata->>'channel_slug';
      
      IF v_existing IS NULL THEN
        INSERT INTO notification_health_alerts (bu_id, alert_type, severity, metadata, cooldown_minutes, escalation_level)
        VALUES (v_alert.bu_id, v_alert.alert_type, v_alert.severity, v_alert.metadata, 10, 'critical');
        v_created := v_created + 1;
      ELSE
        UPDATE notification_health_alerts SET metadata = v_alert.metadata, consecutive_occurrences = consecutive_occurrences + 1, updated_at = now()
        WHERE id = v_existing.id;
      END IF;
    END LOOP;
    
    -- Auto-resolve backlog alerts
    UPDATE notification_health_alerts SET resolved_at = now(), is_active = false, updated_at = now()
    WHERE bu_id = v_bu.id AND alert_type = 'outbox_backlog' AND is_active = true
      AND NOT EXISTS (SELECT 1 FROM notification_outbox WHERE bu_id = v_bu.id AND status = 'pending' AND created_at < now() - interval '10 minutes' HAVING COUNT(*) > 50);
    GET DIAGNOSTICS v_resolved = ROW_COUNT;
  END LOOP;
  
  RETURN QUERY SELECT v_created, v_resolved, '[]'::jsonb;
END;
$$;

-- 11. Helper function: acknowledge alert
CREATE OR REPLACE FUNCTION public.acknowledge_health_alert(p_alert_id uuid, p_notes text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM notification_health_alerts WHERE id = p_alert_id) THEN
    RAISE EXCEPTION 'Alert not found';
  END IF;
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  INSERT INTO notification_health_alert_actions (alert_id, action, actor_profile_id, notes)
  VALUES (p_alert_id, 'acknowledged', v_profile_id, p_notes);
  RETURN true;
END;
$$;

-- 12. Helper function: resolve alert
CREATE OR REPLACE FUNCTION public.resolve_health_alert(p_alert_id uuid, p_notes text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM notification_health_alerts WHERE id = p_alert_id) THEN
    RAISE EXCEPTION 'Alert not found';
  END IF;
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  UPDATE notification_health_alerts SET resolved_at = now(), is_active = false, updated_at = now() WHERE id = p_alert_id;
  INSERT INTO notification_health_alert_actions (alert_id, action, actor_profile_id, notes)
  VALUES (p_alert_id, 'resolved', v_profile_id, p_notes);
  RETURN true;
END;
$$;