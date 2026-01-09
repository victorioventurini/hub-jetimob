
-- =============================================
-- PHASE 1: NOTIFICATION CENTER FOUNDATION
-- Fix root cause + permission keys + defaults
-- =============================================

-- 1) CREATE PERMISSION KEYS FOR NOTIFICATIONS MODULE
-- =============================================
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status)
VALUES
  ('notifications.catalog.view:platform', 'notifications', 'catalog', 'view', 'global', 'Ver catálogo global de eventos e canais de notificação', 'active'),
  ('notifications.catalog.manage:platform', 'notifications', 'catalog', 'manage', 'global', 'Gerenciar catálogo global de eventos e canais de notificação', 'active'),
  ('notifications.bu.view:bu', 'notifications', 'bu', 'view', 'bu', 'Ver configuração de notificações da BU', 'active'),
  ('notifications.bu.manage:bu', 'notifications', 'bu', 'manage', 'bu', 'Gerenciar canais e eventos de notificação da BU', 'active'),
  ('notifications.outbox.view:bu', 'notifications', 'outbox', 'view', 'bu', 'Ver fila de envio de notificações (outbox)', 'active'),
  ('notifications.outbox.retry:bu', 'notifications', 'outbox', 'retry', 'bu', 'Reprocessar notificações com falha', 'active'),
  ('notifications.user.manage:self', 'notifications', 'user', 'manage', 'self', 'Gerenciar preferências pessoais de notificação', 'active'),
  ('notifications.test.send:bu', 'notifications', 'test', 'send', 'bu', 'Enviar notificação de teste', 'active')
ON CONFLICT (key) DO NOTHING;

-- 2) ENABLE DEFAULT CHANNELS FOR ALL EXISTING BUs
-- =============================================
INSERT INTO public.bu_notification_channels (bu_id, channel_slug, is_enabled, config)
SELECT 
  bu.id,
  'in_app',
  true,
  '{}'::jsonb
FROM public.bu_units bu
WHERE NOT EXISTS (
  SELECT 1 FROM public.bu_notification_channels bnc 
  WHERE bnc.bu_id = bu.id AND bnc.channel_slug = 'in_app'
);

INSERT INTO public.bu_notification_channels (bu_id, channel_slug, is_enabled, config)
SELECT 
  bu.id,
  'email',
  true,
  jsonb_build_object(
    'from_name', bu.name,
    'configured', false
  )
FROM public.bu_units bu
WHERE NOT EXISTS (
  SELECT 1 FROM public.bu_notification_channels bnc 
  WHERE bnc.bu_id = bu.id AND bnc.channel_slug = 'email'
);

-- 3) CREATE bu_notification_event_settings TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.bu_notification_event_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  event_slug TEXT NOT NULL,
  channel TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bu_notification_event_settings_unique UNIQUE (bu_id, event_slug, channel)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_bu_notification_event_settings_bu 
  ON public.bu_notification_event_settings(bu_id);
CREATE INDEX IF NOT EXISTS idx_bu_notification_event_settings_event 
  ON public.bu_notification_event_settings(event_slug, channel);

-- 4) ADD RLS POLICIES
-- =============================================
ALTER TABLE public.bu_notification_event_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: Users with BU access can view settings
CREATE POLICY "Users can view BU notification event settings"
  ON public.bu_notification_event_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bu_user_memberships bum
      WHERE bum.bu_id = bu_notification_event_settings.bu_id
        AND bum.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: Only via trigger/RPC (service role) for now
CREATE POLICY "Service role can manage BU notification event settings"
  ON public.bu_notification_event_settings
  FOR ALL
  USING (auth.role() = 'service_role');

-- 5) CREATE TRIGGER FOR UPDATED_AT (using existing function)
-- =============================================
CREATE TRIGGER set_updated_at_bu_notification_event_settings
  BEFORE UPDATE ON public.bu_notification_event_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6) CREATE TRIGGER TO ENFORCE MANDATORY EVENTS
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_bu_notification_event_setting()
RETURNS TRIGGER
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
  WHERE slug = NEW.event_slug;
  
  -- If event is mandatory, force is_enabled = true
  IF v_is_mandatory = true AND NEW.is_enabled = false THEN
    RAISE EXCEPTION 'Cannot disable mandatory event: %', NEW.event_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_bu_notification_event_setting_trigger
  BEFORE INSERT OR UPDATE ON public.bu_notification_event_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_bu_notification_event_setting();

-- 7) BACKFILL: Create default settings for all BUs and events
-- =============================================
INSERT INTO public.bu_notification_event_settings (bu_id, event_slug, channel, is_enabled)
SELECT 
  bu.id,
  ne.slug,
  channel.ch,
  true
FROM public.bu_units bu
CROSS JOIN public.notification_events ne
CROSS JOIN (VALUES ('in_app'), ('email')) AS channel(ch)
WHERE channel.ch = ANY(ne.default_channels)
ON CONFLICT (bu_id, event_slug, channel) DO NOTHING;

-- 8) ADD NOTIFICATIONS.TEST EVENT TO CATALOG (without status column)
-- =============================================
INSERT INTO public.notification_events (
  slug, module, name, description, audience, severity, is_mandatory, default_channels, icon
)
VALUES (
  'notifications.test',
  'core',
  'Notificação de Teste',
  'Notificação enviada para testar a configuração do sistema',
  'internal',
  'info',
  false,
  ARRAY['in_app', 'email'],
  'Bell'
)
ON CONFLICT (slug) DO NOTHING;

-- 9) CREATE RPC FOR SENDING TEST NOTIFICATIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.send_test_notification(
  p_bu_id UUID,
  p_target_user_id UUID,
  p_channels TEXT[] DEFAULT ARRAY['in_app', 'email']
)
RETURNS TABLE (
  notification_id UUID,
  outbox_id UUID,
  channel TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_channel TEXT;
  v_notification_id UUID;
  v_outbox_id UUID;
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();
  
  FOREACH v_channel IN ARRAY p_channels
  LOOP
    IF v_channel = 'in_app' THEN
      -- Create in-app notification
      INSERT INTO public.notifications (
        user_id, bu_id, type, title, message,
        event_slug, actor_id, metadata
      ) VALUES (
        p_target_user_id, p_bu_id, 'info'::notification_type,
        'Notificação de Teste',
        'Esta é uma notificação de teste para verificar o sistema.',
        'notifications.test', v_actor_id,
        jsonb_build_object('test', true, 'sent_at', now())
      )
      RETURNING id INTO v_notification_id;
      
      notification_id := v_notification_id;
      outbox_id := NULL;
      channel := 'in_app';
      status := 'sent';
      RETURN NEXT;
      
    ELSIF v_channel = 'email' THEN
      -- Queue for email delivery
      INSERT INTO public.notification_outbox (
        bu_id, user_id, event_slug, channel_slug, payload, status
      ) VALUES (
        p_bu_id, p_target_user_id, 'notifications.test', 'email',
        jsonb_build_object(
          'title', 'Notificação de Teste',
          'message', 'Esta é uma notificação de teste para verificar o sistema de e-mail.',
          'actor_id', v_actor_id,
          'test', true,
          'sent_at', now()
        ),
        'pending'
      )
      RETURNING id INTO v_outbox_id;
      
      notification_id := NULL;
      outbox_id := v_outbox_id;
      channel := 'email';
      status := 'pending';
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.send_test_notification TO authenticated;
