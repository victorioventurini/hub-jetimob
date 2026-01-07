-- =============================================
-- CENTRAL DE NOTIFICAÇÕES V1 - COMPLEMENTOS
-- Templates, Dedupe Key, Views de Observabilidade
-- =============================================

-- 1. Tabela de Templates de Notificação
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL,
  channel_slug TEXT NOT NULL,
  subject_template TEXT, -- usado para email
  body_template TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(event_slug, channel_slug, version)
);

-- RLS para notification_templates (apenas super_admin)
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage templates"
  ON public.notification_templates
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Adicionar dedupe_key na notification_outbox
ALTER TABLE public.notification_outbox
ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Criar índice único para dedupe_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_dedupe_key 
  ON public.notification_outbox(dedupe_key) 
  WHERE dedupe_key IS NOT NULL;

-- 3. Views de Observabilidade

-- View: Saúde de entregas por BU/canal/status
CREATE OR REPLACE VIEW public.v_notification_delivery_health AS
SELECT 
  bu.name AS bu_name,
  o.bu_id,
  o.channel_slug,
  o.status,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE o.created_at >= now() - interval '24 hours') AS last_24h,
  COUNT(*) FILTER (WHERE o.created_at >= now() - interval '1 hour') AS last_1h,
  AVG(o.retries)::numeric(5,2) AS avg_retries
FROM public.notification_outbox o
LEFT JOIN public.bu_units bu ON bu.id = o.bu_id
GROUP BY bu.name, o.bu_id, o.channel_slug, o.status
ORDER BY o.bu_id, o.channel_slug, o.status;

-- View: Últimas falhas
CREATE OR REPLACE VIEW public.v_notification_failures AS
SELECT 
  o.id,
  bu.name AS bu_name,
  o.bu_id,
  o.user_id,
  o.event_slug,
  o.channel_slug,
  o.status,
  o.retries,
  o.last_error,
  o.created_at,
  o.processed_at
FROM public.notification_outbox o
LEFT JOIN public.bu_units bu ON bu.id = o.bu_id
WHERE o.status = 'failed' OR o.retries > 0
ORDER BY o.created_at DESC
LIMIT 100;

-- 4. Atualizar emit_notification_event para gerar dedupe_key
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
  v_dedupe_key TEXT;
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
      
      -- Generate dedupe_key for idempotency
      v_dedupe_key := p_event_slug || ':' || v_recipient_id::TEXT || ':' || v_channel || ':' || COALESCE(p_context_type, 'null') || ':' || COALESCE(p_context_id::TEXT, 'null');
      
      -- Create in-app notification
      IF v_channel = 'in_app' THEN
        -- Check for duplicate in_app (within last 5 minutes)
        IF EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = v_recipient_id
            AND n.bu_id = p_bu_id
            AND n.event_slug = p_event_slug
            AND n.context_type = p_context_type
            AND n.context_id = p_context_id
            AND n.created_at > now() - interval '5 minutes'
        ) THEN
          CONTINUE;
        END IF;
        
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
        -- Queue for async delivery with dedupe_key
        INSERT INTO public.notification_outbox (
          bu_id, user_id, event_slug, channel_slug, payload, status, dedupe_key
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
          'pending',
          v_dedupe_key
        )
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING id INTO v_outbox_id;
        
        -- Only return if actually inserted
        IF v_outbox_id IS NOT NULL THEN
          -- Return nothing for outbox, only in_app returns IDs
          NULL;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$;

-- 5. Templates padrão para eventos core
INSERT INTO public.notification_templates (event_slug, channel_slug, subject_template, body_template)
VALUES 
  ('core.mention', 'email', '{{actor_name}} mencionou você', '<p>Você foi mencionado por <strong>{{actor_name}}</strong>.</p><p>{{message}}</p><p><a href="{{context_url}}">Ver detalhes</a></p>'),
  ('tickets.created', 'email', 'Novo ticket: {{title}}', '<p>Um novo ticket foi criado.</p><p><strong>{{title}}</strong></p><p>{{message}}</p><p><a href="{{context_url}}">Abrir ticket</a></p>'),
  ('tickets.assigned', 'email', 'Ticket atribuído a você: {{title}}', '<p>Um ticket foi atribuído a você.</p><p><strong>{{title}}</strong></p><p><a href="{{context_url}}">Ver ticket</a></p>'),
  ('tickets.status_changed', 'email', 'Status alterado: {{title}}', '<p>O status de um ticket foi alterado.</p><p><strong>{{title}}</strong></p><p><a href="{{context_url}}">Ver ticket</a></p>'),
  ('okrs.checkin.created', 'email', 'Novo check-in em {{context_type}}', '<p>Um novo check-in foi registrado.</p><p>{{message}}</p><p><a href="{{context_url}}">Ver check-in</a></p>'),
  ('okrs.kr.overdue', 'email', 'Key Result em atraso', '<p>Um Key Result está em atraso.</p><p><strong>{{title}}</strong></p><p><a href="{{context_url}}">Ver KR</a></p>'),
  ('assets.checkout', 'email', 'Ativo retirado', '<p>Um ativo foi retirado.</p><p><strong>{{title}}</strong></p><p>{{message}}</p>'),
  ('assets.checkin', 'email', 'Ativo devolvido', '<p>Um ativo foi devolvido.</p><p><strong>{{title}}</strong></p><p>{{message}}</p>'),
  ('teams.member_added', 'email', 'Novo membro no time', '<p>Um novo membro foi adicionado ao seu time.</p><p><strong>{{title}}</strong></p>'),
  ('kpis.target_reached', 'email', 'Meta atingida! 🎉', '<p>Parabéns! Uma meta foi atingida.</p><p><strong>{{title}}</strong></p><p><a href="{{context_url}}">Ver KPI</a></p>')
ON CONFLICT (event_slug, channel_slug, version) DO NOTHING;

-- 6. Comentários para documentação
COMMENT ON TABLE public.notification_templates IS 'Templates de notificação por evento e canal. Suporta variáveis como {{title}}, {{message}}, {{actor_name}}, {{context_url}}.';
COMMENT ON COLUMN public.notification_outbox.dedupe_key IS 'Chave de deduplicação para idempotência. Formato: event_slug:recipient_id:channel:context_type:context_id';
COMMENT ON VIEW public.v_notification_delivery_health IS 'View de observabilidade: saúde de entregas por BU, canal e status';
COMMENT ON VIEW public.v_notification_failures IS 'View de observabilidade: últimas falhas de entrega de notificações';