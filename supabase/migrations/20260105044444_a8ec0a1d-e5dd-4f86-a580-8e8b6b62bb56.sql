-- =============================================
-- NOTIFICATIONS & MENTIONS SYSTEM
-- =============================================

-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'mention',
  'checkin_created',
  'checkin_overdue',
  'kr_status_changed',
  'shared_okr_update'
);

-- Create notification channel enum
CREATE TYPE public.notification_channel AS ENUM (
  'internal',
  'email',
  'slack',
  'whatsapp'
);

-- Create notification delivery status enum
CREATE TYPE public.notification_delivery_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bu_id UUID REFERENCES public.bu_units(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  context_type TEXT, -- 'kr', 'okr', 'checkin', etc.
  context_id UUID, -- ID of the related entity
  context_url TEXT, -- Direct URL to navigate
  actor_id UUID REFERENCES auth.users(id), -- Who triggered the notification
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can insert notifications (via service role or triggers)
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- =============================================
-- NOTIFICATION DELIVERIES (Multi-channel support)
-- =============================================
CREATE TABLE public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL DEFAULT 'internal',
  status notification_delivery_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can view their notification deliveries)
CREATE POLICY "Users can view their notification deliveries"
  ON public.notification_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_id AND n.user_id = auth.uid()
    )
  );

-- =============================================
-- MENTIONS TABLE
-- =============================================
CREATE TABLE public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bu_id UUID REFERENCES public.bu_units(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL, -- 'checkin', 'comment', etc.
  context_id UUID NOT NULL, -- ID of the checkin/comment
  parent_type TEXT, -- 'kr', 'okr' - what the comment belongs to
  parent_id UUID, -- ID of the kr/okr
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view mentions in their BU"
  ON public.mentions FOR SELECT
  USING (
    bu_id IN (SELECT public.get_user_bus(auth.uid()))
  );

CREATE POLICY "Authenticated users can create mentions"
  ON public.mentions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Indexes
CREATE INDEX idx_mentions_mentioned_user ON public.mentions(mentioned_user_id);
CREATE INDEX idx_mentions_context ON public.mentions(context_type, context_id);

-- =============================================
-- USER NOTIFICATION PREFERENCES (Future use)
-- =============================================
CREATE TABLE public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mention_internal BOOLEAN NOT NULL DEFAULT true,
  mention_email BOOLEAN NOT NULL DEFAULT false,
  mention_slack BOOLEAN NOT NULL DEFAULT false,
  checkin_internal BOOLEAN NOT NULL DEFAULT true,
  checkin_email BOOLEAN NOT NULL DEFAULT false,
  status_change_internal BOOLEAN NOT NULL DEFAULT true,
  status_change_email BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTION: Create notification with mention
-- =============================================
CREATE OR REPLACE FUNCTION public.create_mention_notification(
  p_mentioned_user_id UUID,
  p_author_id UUID,
  p_bu_id UUID,
  p_context_type TEXT,
  p_context_id UUID,
  p_parent_type TEXT,
  p_parent_id UUID,
  p_context_url TEXT,
  p_author_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_mention_id UUID;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Don't notify the author about their own mention
  IF p_mentioned_user_id = p_author_id THEN
    RETURN NULL;
  END IF;

  -- Build notification message
  v_title := p_author_name || ' mencionou você';
  v_message := CASE 
    WHEN p_context_type = 'checkin' THEN 'em um check-in de KR'
    ELSE 'em um comentário'
  END;

  -- Create notification
  INSERT INTO public.notifications (
    user_id, bu_id, type, title, message,
    context_type, context_id, context_url, actor_id
  )
  VALUES (
    p_mentioned_user_id, p_bu_id, 'mention', v_title, v_message,
    p_parent_type, p_parent_id, p_context_url, p_author_id
  )
  RETURNING id INTO v_notification_id;

  -- Create internal delivery record
  INSERT INTO public.notification_deliveries (notification_id, channel, status, sent_at)
  VALUES (v_notification_id, 'internal', 'sent', now());

  -- Create mention record
  INSERT INTO public.mentions (
    mentioned_user_id, author_id, bu_id,
    context_type, context_id, parent_type, parent_id, notification_id
  )
  VALUES (
    p_mentioned_user_id, p_author_id, p_bu_id,
    p_context_type, p_context_id, p_parent_type, p_parent_id, v_notification_id
  )
  RETURNING id INTO v_mention_id;

  RETURN v_notification_id;
END;
$$;

-- =============================================
-- FUNCTION: Mark notification as read
-- =============================================
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- =============================================
-- FUNCTION: Mark all notifications as read
-- =============================================
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;