-- Add provider column to notification_outbox
-- This tracks which email system was used to send the notification (sendgrid, resend, etc.)

ALTER TABLE public.notification_outbox 
ADD COLUMN IF NOT EXISTS provider text;

-- Add comment for documentation
COMMENT ON COLUMN public.notification_outbox.provider IS 'Email provider used: sendgrid, resend, slack, webhook, in_app';

-- Create index for provider filtering
CREATE INDEX IF NOT EXISTS idx_notification_outbox_provider ON public.notification_outbox(provider) WHERE status = 'sent';