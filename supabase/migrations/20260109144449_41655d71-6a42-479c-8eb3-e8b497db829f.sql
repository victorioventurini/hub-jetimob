-- 1. Adicionar integração cron-job.org ao catálogo
INSERT INTO hub_integrations_catalog (
  integration_key,
  name,
  description,
  icon,
  color,
  supports_global_config,
  supports_bu_override,
  supports_agents,
  status,
  display_order,
  documentation_url
) VALUES (
  'cron-job',
  'cron-job.org',
  'Agendador externo para processamento automático de notificações e health checks do sistema.',
  'clock',
  '#4F46E5',
  true,
  false,
  false,
  'active',
  0,
  'https://docs.cron-job.org'
);

-- 2. Criar tabela de logs de execução do cron
CREATE TABLE public.cron_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('success', 'error')),
  duration_ms integer,
  outbox_processed integer DEFAULT 0,
  outbox_sent integer DEFAULT 0,
  outbox_failed integer DEFAULT 0,
  health_alerts_created integer DEFAULT 0,
  health_alerts_resolved integer DEFAULT 0,
  error_message text,
  correlation_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_cron_logs_ran_at ON cron_execution_logs(ran_at DESC);

ALTER TABLE cron_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron logs"
  ON cron_execution_logs FOR SELECT
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "System can insert cron logs"
  ON cron_execution_logs FOR INSERT
  WITH CHECK (true);

-- 3. Criar config global para cron-job
INSERT INTO hub_integrations_global_config (
  integration_key,
  is_enabled_global,
  config_encrypted
) VALUES (
  'cron-job',
  false,
  '{}'::jsonb
) ON CONFLICT (integration_key) DO NOTHING;