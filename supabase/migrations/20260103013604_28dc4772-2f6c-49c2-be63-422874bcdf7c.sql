-- =============================================
-- INTEGRATIONS MULTI-BU ARCHITECTURE
-- =============================================

-- ENUM for config mode
CREATE TYPE integration_config_mode AS ENUM ('use_global', 'override');

-- ENUM for test status
CREATE TYPE integration_test_status AS ENUM ('ok', 'error', 'pending');

-- ENUM for agent scope
CREATE TYPE agent_scope AS ENUM ('global', 'bu');

-- ENUM for agent output format
CREATE TYPE agent_output_format AS ENUM ('text', 'json');

-- =============================================
-- 1) HUB INTEGRATIONS CATALOG
-- Master catalog of all available integrations
-- =============================================
CREATE TABLE public.hub_integrations_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'plug',
  color text DEFAULT '#6B7280',
  supports_global_config boolean NOT NULL DEFAULT true,
  supports_bu_override boolean NOT NULL DEFAULT true,
  supports_agents boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
  display_order integer NOT NULL DEFAULT 100,
  documentation_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hub_integrations_catalog ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view active integrations catalog"
  ON public.hub_integrations_catalog FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage integrations catalog"
  ON public.hub_integrations_catalog FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

-- =============================================
-- 2) HUB INTEGRATIONS GLOBAL CONFIG
-- Global configuration for each integration
-- =============================================
CREATE TABLE public.hub_integrations_global_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text NOT NULL UNIQUE REFERENCES public.hub_integrations_catalog(integration_key) ON DELETE CASCADE,
  is_enabled_global boolean NOT NULL DEFAULT false,
  config_encrypted jsonb DEFAULT '{}'::jsonb,
  last_test_status integration_test_status,
  last_test_message text,
  last_test_at timestamptz,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hub_integrations_global_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view global configs"
  ON public.hub_integrations_global_config FOR SELECT
  USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "Admins can manage global configs"
  ON public.hub_integrations_global_config FOR ALL
  USING (is_admin_or_ceo(auth.uid()));

-- =============================================
-- 3) BU INTEGRATIONS CONFIG
-- Per-BU integration configuration with override capability
-- =============================================
CREATE TABLE public.bu_integrations_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  integration_key text NOT NULL REFERENCES public.hub_integrations_catalog(integration_key) ON DELETE CASCADE,
  is_enabled_in_bu boolean NOT NULL DEFAULT false,
  config_mode integration_config_mode NOT NULL DEFAULT 'use_global',
  config_override_encrypted jsonb,
  last_test_status integration_test_status,
  last_test_message text,
  last_test_at timestamptz,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bu_id, integration_key)
);

-- Enable RLS
ALTER TABLE public.bu_integrations_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their BU integration configs"
  ON public.bu_integrations_config FOR SELECT
  USING (user_has_bu_access(auth.uid(), bu_id) OR is_admin_or_ceo(auth.uid()));

CREATE POLICY "BU admins can manage their BU integration configs"
  ON public.bu_integrations_config FOR ALL
  USING (is_bu_admin(auth.uid(), bu_id) OR is_admin_or_ceo(auth.uid()));

-- =============================================
-- 4) AI AGENTS (Global and BU-scoped)
-- =============================================
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope agent_scope NOT NULL DEFAULT 'bu',
  bu_id uuid REFERENCES public.bu_units(id) ON DELETE CASCADE,
  integration_key text NOT NULL REFERENCES public.hub_integrations_catalog(integration_key) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  system_prompt text NOT NULL,
  output_format agent_output_format NOT NULL DEFAULT 'text',
  output_schema jsonb,
  allowed_tools jsonb DEFAULT '[]'::jsonb,
  model_name text,
  max_tokens integer,
  temperature numeric(3,2) DEFAULT 0.7,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scope_bu_check CHECK (
    (scope = 'global' AND bu_id IS NULL) OR
    (scope = 'bu' AND bu_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view active global agents"
  ON public.ai_agents FOR SELECT
  USING (scope = 'global' AND is_active = true);

CREATE POLICY "Users can view their BU agents"
  ON public.ai_agents FOR SELECT
  USING (scope = 'bu' AND user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Admins can manage global agents"
  ON public.ai_agents FOR ALL
  USING (scope = 'global' AND is_admin_or_ceo(auth.uid()));

CREATE POLICY "BU admins can manage their BU agents"
  ON public.ai_agents FOR ALL
  USING (scope = 'bu' AND (is_bu_admin(auth.uid(), bu_id) OR is_admin_or_ceo(auth.uid())));

-- =============================================
-- 5) BU AGENT ACTIVATIONS
-- Which global agents are enabled in which BUs
-- =============================================
CREATE TABLE public.bu_agent_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  custom_system_prompt text,
  enabled_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bu_id, agent_id)
);

-- Enable RLS
ALTER TABLE public.bu_agent_activations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their BU agent activations"
  ON public.bu_agent_activations FOR SELECT
  USING (user_has_bu_access(auth.uid(), bu_id) OR is_admin_or_ceo(auth.uid()));

CREATE POLICY "BU admins can manage their BU agent activations"
  ON public.bu_agent_activations FOR ALL
  USING (is_bu_admin(auth.uid(), bu_id) OR is_admin_or_ceo(auth.uid()));

-- =============================================
-- 6) AI AGENT LOGS
-- Audit log for agent executions
-- =============================================
CREATE TABLE public.ai_agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  agent_name text NOT NULL,
  scope agent_scope NOT NULL,
  bu_id uuid REFERENCES public.bu_units(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  integration_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  error_message text,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all logs"
  ON public.ai_agent_logs FOR SELECT
  USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "BU admins can view their BU logs"
  ON public.ai_agent_logs FOR SELECT
  USING (bu_id IS NOT NULL AND is_bu_admin(auth.uid(), bu_id));

CREATE POLICY "System can insert logs"
  ON public.ai_agent_logs FOR INSERT
  WITH CHECK (true);

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
CREATE TRIGGER update_hub_integrations_catalog_updated_at
  BEFORE UPDATE ON public.hub_integrations_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hub_integrations_global_config_updated_at
  BEFORE UPDATE ON public.hub_integrations_global_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bu_integrations_config_updated_at
  BEFORE UPDATE ON public.bu_integrations_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bu_agent_activations_updated_at
  BEFORE UPDATE ON public.bu_agent_activations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: Get resolved integration config
-- Returns the effective config for a BU (global or override)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_integration_config_for_bu(
  p_bu_id uuid,
  p_integration_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_config record;
  v_global_config record;
  v_result jsonb;
BEGIN
  -- Get BU config
  SELECT * INTO v_bu_config
  FROM public.bu_integrations_config
  WHERE bu_id = p_bu_id AND integration_key = p_integration_key;
  
  -- If not enabled in BU, return null
  IF v_bu_config IS NULL OR NOT v_bu_config.is_enabled_in_bu THEN
    RETURN NULL;
  END IF;
  
  -- If override mode, return BU config
  IF v_bu_config.config_mode = 'override' THEN
    RETURN v_bu_config.config_override_encrypted;
  END IF;
  
  -- Otherwise, get global config
  SELECT config_encrypted INTO v_result
  FROM public.hub_integrations_global_config
  WHERE integration_key = p_integration_key
    AND is_enabled_global = true;
  
  RETURN v_result;
END;
$$;

-- =============================================
-- SEED: Initial integrations catalog
-- =============================================
INSERT INTO public.hub_integrations_catalog (integration_key, name, description, icon, color, supports_global_config, supports_bu_override, supports_agents, display_order)
VALUES
  ('chatgpt', 'ChatGPT / OpenAI', 'Integração com modelos de IA para chat, automações e agentes inteligentes', 'bot', '#10B981', true, true, true, 1),
  ('sendgrid', 'SendGrid', 'Envio de e-mails transacionais e campanhas de marketing', 'mail', '#3B82F6', true, true, false, 2),
  ('google-maps', 'Google Maps', 'Mapas, geocodificação, rotas e localização', 'map-pin', '#EF4444', true, true, false, 3),
  ('slack', 'Slack', 'Notificações e comunicação em tempo real com times', 'message-square', '#8B5CF6', true, true, false, 4),
  ('zapier', 'Zapier', 'Automações e integrações com milhares de aplicativos', 'zap', '#F97316', true, true, false, 5),
  ('whatsapp', 'WhatsApp Business', 'Comunicação via WhatsApp com clientes e colaboradores', 'phone', '#22C55E', true, true, false, 6)
ON CONFLICT (integration_key) DO NOTHING;