-- Create table for integration configurations (API keys, webhooks, etc.)
CREATE TABLE public.integration_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_id, config_key)
);

-- Enable RLS
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage integration configs (contains sensitive data)
CREATE POLICY "Admins can manage integration configs"
ON public.integration_configs
FOR ALL
USING (is_admin_or_ceo(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_integration_configs_updated_at
BEFORE UPDATE ON public.integration_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for integration webhooks
CREATE TABLE public.integration_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  headers JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;

-- Only admins can manage webhooks
CREATE POLICY "Admins can manage integration webhooks"
ON public.integration_webhooks
FOR ALL
USING (is_admin_or_ceo(auth.uid()));

-- Authenticated users can view active webhooks
CREATE POLICY "Users can view active webhooks"
ON public.integration_webhooks
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_integration_webhooks_updated_at
BEFORE UPDATE ON public.integration_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();