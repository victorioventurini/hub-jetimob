-- =============================================
-- NOTIFICATION CENTER v2.0 - Complete Migration
-- =============================================

-- ENUMS
DO $$ BEGIN
  CREATE TYPE notification_audience AS ENUM ('internal', 'external', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_outbox_status AS ENUM ('pending', 'processing', 'sent', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 1. NOTIFICATION EVENTS CATALOG (GLOBAL)
-- =============================================
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  audience notification_audience NOT NULL DEFAULT 'internal',
  severity notification_severity NOT NULL DEFAULT 'info',
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  default_channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_module ON public.notification_events(module);
CREATE INDEX IF NOT EXISTS idx_notification_events_audience ON public.notification_events(audience);

-- =============================================
-- 2. NOTIFICATION CHANNELS (GLOBAL)
-- =============================================
CREATE TABLE IF NOT EXISTS public.notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  requires_configuration BOOLEAN NOT NULL DEFAULT false,
  config_schema JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. BU NOTIFICATION CHANNELS (PER BU)
-- =============================================
CREATE TABLE IF NOT EXISTS public.bu_notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  channel_slug TEXT NOT NULL REFERENCES public.notification_channels(slug) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bu_id, channel_slug)
);

CREATE INDEX IF NOT EXISTS idx_bu_notification_channels_bu ON public.bu_notification_channels(bu_id);

-- =============================================
-- 4. USER NOTIFICATION PREFERENCES V2 (PER USER + BU)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_notification_preferences_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  event_slug TEXT NOT NULL REFERENCES public.notification_events(slug) ON DELETE CASCADE,
  channel_slug TEXT NOT NULL REFERENCES public.notification_channels(slug) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, bu_id, event_slug, channel_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_v2_user ON public.user_notification_preferences_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_v2_bu ON public.user_notification_preferences_v2(bu_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_v2_event ON public.user_notification_preferences_v2(event_slug);

-- =============================================
-- 5. ADD event_slug TO EXISTING notifications TABLE
-- =============================================
DO $$ BEGIN
  ALTER TABLE public.notifications ADD COLUMN event_slug TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =============================================
-- 6. NOTIFICATION OUTBOX (ASYNC DELIVERY)
-- =============================================
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_slug TEXT NOT NULL REFERENCES public.notification_events(slug),
  channel_slug TEXT NOT NULL REFERENCES public.notification_channels(slug),
  payload JSONB NOT NULL DEFAULT '{}',
  status notification_outbox_status NOT NULL DEFAULT 'pending',
  retries INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status ON public.notification_outbox(status);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON public.notification_outbox(status, next_retry_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_notification_outbox_bu ON public.notification_outbox(bu_id);

-- =============================================
-- 7. RLS POLICIES
-- =============================================

-- notification_events (read by anyone authenticated, write by super_admin)
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read notification events" ON public.notification_events;
CREATE POLICY "Anyone can read notification events"
  ON public.notification_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super admins can manage notification events" ON public.notification_events;
CREATE POLICY "Super admins can manage notification events"
  ON public.notification_events FOR ALL
  USING (is_super_admin(auth.uid()));

-- notification_channels (read by anyone, write by super_admin)
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read notification channels" ON public.notification_channels;
CREATE POLICY "Anyone can read notification channels"
  ON public.notification_channels FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super admins can manage notification channels" ON public.notification_channels;
CREATE POLICY "Super admins can manage notification channels"
  ON public.notification_channels FOR ALL
  USING (is_super_admin(auth.uid()));

-- bu_notification_channels (BU scoped)
ALTER TABLE public.bu_notification_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read BU notification channels" ON public.bu_notification_channels;
CREATE POLICY "Users can read BU notification channels"
  ON public.bu_notification_channels FOR SELECT
  USING (user_has_bu_access(auth.uid(), bu_id));

DROP POLICY IF EXISTS "BU admins can manage BU notification channels" ON public.bu_notification_channels;
CREATE POLICY "BU admins can manage BU notification channels"
  ON public.bu_notification_channels FOR ALL
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- user_notification_preferences_v2 (user can manage own)
ALTER TABLE public.user_notification_preferences_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notification preferences" ON public.user_notification_preferences_v2;
CREATE POLICY "Users can read own notification preferences"
  ON public.user_notification_preferences_v2 FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON public.user_notification_preferences_v2;
CREATE POLICY "Users can manage own notification preferences"
  ON public.user_notification_preferences_v2 FOR ALL
  USING (user_id = auth.uid());

-- notification_outbox (system access only, users can read own)
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own outbox entries" ON public.notification_outbox;
CREATE POLICY "Users can read own outbox entries"
  ON public.notification_outbox FOR SELECT
  USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));

-- =============================================
-- 8. SEED DEFAULT CHANNELS
-- =============================================
INSERT INTO public.notification_channels (slug, name, description, icon, requires_configuration, display_order)
VALUES
  ('in_app', 'Notificação Interna', 'Notificações dentro do Hub', 'Bell', false, 1),
  ('email', 'E-mail', 'Notificações por e-mail', 'Mail', false, 2),
  ('slack', 'Slack', 'Notificações via Slack', 'Slack', true, 3),
  ('whatsapp', 'WhatsApp', 'Notificações via WhatsApp', 'MessageCircle', true, 4),
  ('webhook', 'Webhook', 'Notificações via Webhook HTTP', 'Globe', true, 5)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 9. SEED DEFAULT EVENTS
-- =============================================
INSERT INTO public.notification_events (slug, module, name, description, audience, severity, is_mandatory, default_channels, icon)
VALUES
  -- Mentions (existing)
  ('mention.created', 'core', 'Menção em comentário', 'Você foi mencionado em um comentário', 'both', 'info', false, ARRAY['in_app', 'email'], 'AtSign'),
  
  -- OKRs
  ('okr.checkin.created', 'okrs', 'Novo Check-in', 'Um check-in foi registrado em um KR que você acompanha', 'internal', 'info', false, ARRAY['in_app'], 'TrendingUp'),
  ('okr.checkin.overdue', 'okrs', 'Check-in Atrasado', 'Um KR está sem check-in há mais de 14 dias', 'internal', 'warning', false, ARRAY['in_app', 'email'], 'Clock'),
  ('okr.kr.status_changed', 'okrs', 'Status de KR Alterado', 'O status de um KR foi alterado', 'internal', 'info', false, ARRAY['in_app'], 'AlertTriangle'),
  ('okr.objective.shared', 'okrs', 'Objetivo Compartilhado', 'Um objetivo foi compartilhado com você', 'internal', 'info', false, ARRAY['in_app'], 'Users'),
  
  -- Tickets
  ('ticket.created', 'tickets', 'Novo Ticket', 'Um novo ticket foi criado', 'both', 'info', false, ARRAY['in_app', 'email'], 'Ticket'),
  ('ticket.message.created', 'tickets', 'Nova Mensagem', 'Nova mensagem em um ticket', 'both', 'info', false, ARRAY['in_app', 'email'], 'MessageSquare'),
  ('ticket.status.changed', 'tickets', 'Status do Ticket Alterado', 'O status de um ticket foi alterado', 'both', 'info', false, ARRAY['in_app', 'email'], 'RefreshCw'),
  ('ticket.assigned', 'tickets', 'Ticket Atribuído', 'Um ticket foi atribuído a você', 'internal', 'info', true, ARRAY['in_app', 'email'], 'UserCheck'),
  ('ticket.sla.warning', 'tickets', 'Alerta de SLA', 'O SLA de um ticket está próximo do vencimento', 'internal', 'warning', true, ARRAY['in_app', 'email'], 'AlertTriangle'),
  ('ticket.sla.breached', 'tickets', 'SLA Violado', 'O SLA de um ticket foi violado', 'internal', 'critical', true, ARRAY['in_app', 'email'], 'AlertOctagon'),
  
  -- Assets
  ('asset.checkout', 'assets', 'Ativo Emprestado', 'Um ativo foi emprestado para você', 'internal', 'info', true, ARRAY['in_app', 'email'], 'Package'),
  ('asset.return.reminder', 'assets', 'Lembrete de Devolução', 'Um ativo precisa ser devolvido', 'internal', 'warning', true, ARRAY['in_app', 'email'], 'Calendar'),
  ('asset.maintenance.scheduled', 'assets', 'Manutenção Agendada', 'Uma manutenção foi agendada para um ativo', 'internal', 'info', false, ARRAY['in_app'], 'Wrench'),
  
  -- Teams
  ('team.member.added', 'teams', 'Adicionado ao Time', 'Você foi adicionado a um time', 'internal', 'info', true, ARRAY['in_app', 'email'], 'Users'),
  ('team.member.removed', 'teams', 'Removido do Time', 'Você foi removido de um time', 'internal', 'info', true, ARRAY['in_app', 'email'], 'UserMinus'),
  
  -- KPIs
  ('kpi.target.reached', 'kpis', 'Meta Atingida', 'Uma meta de KPI foi atingida', 'internal', 'info', false, ARRAY['in_app'], 'Target'),
  ('kpi.value.updated', 'kpis', 'Valor de KPI Atualizado', 'O valor de um KPI que você acompanha foi atualizado', 'internal', 'info', false, ARRAY['in_app'], 'BarChart2')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  audience = EXCLUDED.audience,
  severity = EXCLUDED.severity,
  is_mandatory = EXCLUDED.is_mandatory,
  default_channels = EXCLUDED.default_channels,
  icon = EXCLUDED.icon,
  updated_at = now();

-- =============================================
-- 10. FUNCTION: Emit Notification Event
-- =============================================
CREATE OR REPLACE FUNCTION public.emit_notification_event(
  p_event_slug TEXT,
  p_bu_id UUID,
  p_recipient_user_ids UUID[],
  p_actor_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_context_type TEXT DEFAULT NULL,
  p_context_id UUID DEFAULT NULL,
  p_context_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event public.notification_events%ROWTYPE;
  v_recipient_id UUID;
  v_channel TEXT;
  v_pref_enabled BOOLEAN;
  v_notification_id UUID;
  v_outbox_id UUID;
  v_is_external BOOLEAN;
  v_channel_enabled BOOLEAN;
BEGIN
  -- Get event definition
  SELECT * INTO v_event
  FROM public.notification_events
  WHERE slug = p_event_slug;
  
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Unknown notification event: %', p_event_slug;
  END IF;
  
  -- Process each recipient
  FOREACH v_recipient_id IN ARRAY p_recipient_user_ids
  LOOP
    -- Skip if actor is recipient (don't notify yourself)
    IF v_recipient_id = p_actor_id THEN
      CONTINUE;
    END IF;
    
    -- Check if user is external (partner contact)
    v_is_external := EXISTS (
      SELECT 1 FROM public.partner_contacts pc
      WHERE pc.profile_user_id = v_recipient_id
        AND pc.status = 'active'
        AND pc.deleted_at IS NULL
    );
    
    -- Skip if audience doesn't match
    IF v_is_external AND v_event.audience = 'internal' THEN
      CONTINUE;
    END IF;
    
    IF NOT v_is_external AND v_event.audience = 'external' THEN
      CONTINUE;
    END IF;
    
    -- Process each default channel
    FOREACH v_channel IN ARRAY v_event.default_channels
    LOOP
      -- Check if channel is enabled for BU (for non-in_app channels)
      IF v_channel != 'in_app' THEN
        SELECT is_enabled INTO v_channel_enabled
        FROM public.bu_notification_channels
        WHERE bu_id = p_bu_id AND channel_slug = v_channel;
        
        IF v_channel_enabled IS FALSE THEN
          CONTINUE;
        END IF;
      END IF;
      
      -- Check user preference (unless mandatory)
      IF NOT v_event.is_mandatory THEN
        SELECT enabled INTO v_pref_enabled
        FROM public.user_notification_preferences_v2
        WHERE user_id = v_recipient_id
          AND bu_id = p_bu_id
          AND event_slug = p_event_slug
          AND channel_slug = v_channel;
        
        -- If preference exists and is disabled, skip
        IF v_pref_enabled IS FALSE THEN
          CONTINUE;
        END IF;
      END IF;
      
      -- Create in-app notification
      IF v_channel = 'in_app' THEN
        INSERT INTO public.notifications (
          user_id, bu_id, type, title, message,
          context_type, context_id, context_url, actor_id,
          event_slug, metadata
        ) VALUES (
          v_recipient_id, p_bu_id, 'mention'::notification_type,
          COALESCE(p_title, v_event.name),
          COALESCE(p_message, v_event.description),
          p_context_type, p_context_id, p_context_url, p_actor_id,
          p_event_slug, p_metadata
        )
        RETURNING id INTO v_notification_id;
        
        RETURN NEXT v_notification_id;
        
      ELSE
        -- Queue for async delivery
        INSERT INTO public.notification_outbox (
          bu_id, user_id, event_slug, channel_slug, payload, status
        ) VALUES (
          p_bu_id, v_recipient_id, p_event_slug, v_channel,
          jsonb_build_object(
            'title', COALESCE(p_title, v_event.name),
            'message', COALESCE(p_message, v_event.description),
            'context_type', p_context_type,
            'context_id', p_context_id,
            'context_url', p_context_url,
            'actor_id', p_actor_id,
            'metadata', p_metadata,
            'severity', v_event.severity
          ),
          'pending'
        )
        RETURNING id INTO v_outbox_id;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$;

-- =============================================
-- 11. FUNCTION: Get User Notification Settings
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_notification_settings(
  p_user_id UUID,
  p_bu_id UUID
)
RETURNS TABLE (
  event_slug TEXT,
  event_name TEXT,
  event_description TEXT,
  event_module TEXT,
  event_severity notification_severity,
  is_mandatory BOOLEAN,
  channel_slug TEXT,
  channel_name TEXT,
  enabled BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_external BOOLEAN;
BEGIN
  -- Check if user is external
  v_is_external := EXISTS (
    SELECT 1 FROM public.partner_contacts pc
    WHERE pc.profile_user_id = p_user_id
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL
  );
  
  RETURN QUERY
  SELECT
    e.slug AS event_slug,
    e.name AS event_name,
    e.description AS event_description,
    e.module AS event_module,
    e.severity AS event_severity,
    e.is_mandatory,
    c.slug AS channel_slug,
    c.name AS channel_name,
    CASE
      WHEN e.is_mandatory THEN true
      WHEN p.enabled IS NOT NULL THEN p.enabled
      ELSE (c.slug = ANY(e.default_channels))
    END AS enabled
  FROM public.notification_events e
  CROSS JOIN public.notification_channels c
  LEFT JOIN public.user_notification_preferences_v2 p
    ON p.user_id = p_user_id
    AND p.bu_id = p_bu_id
    AND p.event_slug = e.slug
    AND p.channel_slug = c.slug
  WHERE c.status = 'active'
    AND (
      (NOT v_is_external AND e.audience IN ('internal', 'both'))
      OR (v_is_external AND e.audience IN ('external', 'both'))
    )
  ORDER BY e.module, e.slug, c.display_order;
END;
$$;

-- =============================================
-- 12. FUNCTION: Set User Notification Preference
-- =============================================
CREATE OR REPLACE FUNCTION public.set_user_notification_preference(
  p_user_id UUID,
  p_bu_id UUID,
  p_event_slug TEXT,
  p_channel_slug TEXT,
  p_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_mandatory BOOLEAN;
BEGIN
  -- Check if event is mandatory
  SELECT is_mandatory INTO v_is_mandatory
  FROM public.notification_events
  WHERE slug = p_event_slug;
  
  IF v_is_mandatory THEN
    RAISE EXCEPTION 'Cannot disable mandatory notification event: %', p_event_slug;
  END IF;
  
  -- Upsert preference
  INSERT INTO public.user_notification_preferences_v2 (
    user_id, bu_id, event_slug, channel_slug, enabled
  ) VALUES (
    p_user_id, p_bu_id, p_event_slug, p_channel_slug, p_enabled
  )
  ON CONFLICT (user_id, bu_id, event_slug, channel_slug)
  DO UPDATE SET enabled = p_enabled, updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- =============================================
-- 13. GRANT EXECUTE PERMISSIONS
-- =============================================
GRANT EXECUTE ON FUNCTION public.emit_notification_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notification_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_notification_preference TO authenticated;