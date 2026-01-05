-- =============================================
-- MÓDULO DE AUTOMAÇÕES E INTEGRAÇÕES
-- =============================================

-- Catálogo de eventos (outgoing)
CREATE TABLE public.automation_event_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  event_version TEXT NOT NULL DEFAULT '1.0',
  payload_schema JSONB DEFAULT '{}'::jsonb,
  payload_example JSONB DEFAULT '{}'::jsonb,
  scope TEXT NOT NULL DEFAULT 'bu' CHECK (scope IN ('global', 'bu')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo de ações (incoming)
CREATE TABLE public.automation_action_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  action_version TEXT NOT NULL DEFAULT '1.0',
  payload_schema JSONB DEFAULT '{}'::jsonb,
  payload_example JSONB DEFAULT '{}'::jsonb,
  required_fields TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conexões de webhook (outgoing)
CREATE TABLE public.automation_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  bu_id UUID REFERENCES public.bu_units(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'bu' CHECK (scope IN ('global', 'bu')),
  webhook_url TEXT NOT NULL,
  http_method TEXT NOT NULL DEFAULT 'POST',
  headers_encrypted JSONB DEFAULT '{}'::jsonb,
  auth_type TEXT DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'api_key', 'basic')),
  auth_config_encrypted JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  retry_count INTEGER NOT NULL DEFAULT 3,
  timeout_ms INTEGER NOT NULL DEFAULT 5000,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vínculo entre conexões e eventos
CREATE TABLE public.automation_connection_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.automation_connections(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL REFERENCES public.automation_event_catalog(event_key) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, event_key)
);

-- Tokens de entrada para ações (incoming)
CREATE TABLE public.automation_incoming_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  token_hash TEXT NOT NULL,
  bu_id UUID REFERENCES public.bu_units(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'bu' CHECK (scope IN ('global', 'bu')),
  allowed_actions TEXT[] DEFAULT '{}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Logs de automação
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('event', 'action')),
  event_key TEXT,
  action_key TEXT,
  connection_id UUID REFERENCES public.automation_connections(id) ON DELETE SET NULL,
  token_id UUID REFERENCES public.automation_incoming_tokens(id) ON DELETE SET NULL,
  bu_id UUID REFERENCES public.bu_units(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending', 'retrying')),
  status_code INTEGER,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  latency_ms INTEGER,
  retry_attempt INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_automation_logs_type ON public.automation_logs(type);
CREATE INDEX idx_automation_logs_status ON public.automation_logs(status);
CREATE INDEX idx_automation_logs_bu_id ON public.automation_logs(bu_id);
CREATE INDEX idx_automation_logs_created_at ON public.automation_logs(created_at DESC);
CREATE INDEX idx_automation_connections_bu_id ON public.automation_connections(bu_id);
CREATE INDEX idx_automation_incoming_tokens_bu_id ON public.automation_incoming_tokens(bu_id);

-- Trigger para updated_at
CREATE TRIGGER update_automation_event_catalog_updated_at
  BEFORE UPDATE ON public.automation_event_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_action_catalog_updated_at
  BEFORE UPDATE ON public.automation_action_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_connections_updated_at
  BEFORE UPDATE ON public.automation_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_incoming_tokens_updated_at
  BEFORE UPDATE ON public.automation_incoming_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.automation_event_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_action_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_connection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_incoming_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para catálogos (leitura para todos autenticados)
CREATE POLICY "Authenticated users can view event catalog"
  ON public.automation_event_catalog FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can view action catalog"
  ON public.automation_action_catalog FOR SELECT
  TO authenticated USING (true);

-- Políticas para conexões (por BU ou global para admins)
CREATE POLICY "Users can view connections for their BU"
  ON public.automation_connections FOR SELECT
  TO authenticated USING (
    scope = 'global' OR 
    bu_id IN (SELECT bu_id FROM public.bu_user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage connections"
  ON public.automation_connections FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Políticas para connection_events
CREATE POLICY "Users can view connection events"
  ON public.automation_connection_events FOR SELECT
  TO authenticated USING (
    connection_id IN (
      SELECT id FROM public.automation_connections 
      WHERE scope = 'global' OR bu_id IN (SELECT bu_id FROM public.bu_user_memberships WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage connection events"
  ON public.automation_connection_events FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Políticas para tokens
CREATE POLICY "Users can view tokens for their BU"
  ON public.automation_incoming_tokens FOR SELECT
  TO authenticated USING (
    scope = 'global' OR 
    bu_id IN (SELECT bu_id FROM public.bu_user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage tokens"
  ON public.automation_incoming_tokens FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Políticas para logs
CREATE POLICY "Users can view logs for their BU"
  ON public.automation_logs FOR SELECT
  TO authenticated USING (
    bu_id IS NULL OR 
    bu_id IN (SELECT bu_id FROM public.bu_user_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert logs"
  ON public.automation_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- =============================================
-- CATÁLOGO INICIAL DE EVENTOS
-- =============================================

INSERT INTO public.automation_event_catalog (event_key, category, name, description, payload_example) VALUES
-- USUÁRIOS
('user.created', 'users', 'Usuário criado', 'Disparado quando um novo usuário é criado no Hub', 
  '{"user_id": "uuid", "email": "email@example.com", "name": "Nome do Usuário"}'::jsonb),
('user.updated', 'users', 'Usuário atualizado', 'Alterações relevantes no perfil do usuário',
  '{"user_id": "uuid", "changed_fields": ["name", "avatar_url"]}'::jsonb),
('user.completed_profile', 'users', 'Perfil completo', 'Usuário finalizou o onboarding obrigatório',
  '{"user_id": "uuid", "completed_at": "2026-01-04T18:00:00Z"}'::jsonb),
('user.logged_in', 'users', 'Login realizado', 'Login realizado com sucesso',
  '{"user_id": "uuid", "login_method": "magic_link"}'::jsonb),
('user.joined_team', 'users', 'Entrou no time', 'Usuário vinculado a um time, sub-time ou squad',
  '{"user_id": "uuid", "team_id": "uuid", "team_name": "Nome do Time", "role": "member"}'::jsonb),
('user.left_team', 'users', 'Saiu do time', 'Usuário removido de um time',
  '{"user_id": "uuid", "team_id": "uuid", "team_name": "Nome do Time"}'::jsonb),

-- BUSINESS UNITS
('bu.created', 'bu', 'BU criada', 'Nova Business Unit criada',
  '{"bu_id": "uuid", "name": "Nome da BU", "cnpj": "00.000.000/0001-00"}'::jsonb),
('bu.updated', 'bu', 'BU atualizada', 'Alterações de configuração da BU',
  '{"bu_id": "uuid", "changed_fields": ["name", "primary_color"]}'::jsonb),
('bu.activated', 'bu', 'BU ativada', 'Business Unit ativada',
  '{"bu_id": "uuid", "name": "Nome da BU"}'::jsonb),
('bu.deactivated', 'bu', 'BU desativada', 'Business Unit desativada',
  '{"bu_id": "uuid", "name": "Nome da BU"}'::jsonb),
('bu.selected', 'bu', 'BU selecionada', 'Usuário acessou uma BU específica',
  '{"bu_id": "uuid", "name": "Nome da BU"}'::jsonb),

-- TIMES / SQUADS
('team.created', 'teams', 'Time criado', 'Novo time criado',
  '{"team_id": "uuid", "name": "Nome do Time", "parent_team_id": null}'::jsonb),
('team.updated', 'teams', 'Time atualizado', 'Alterações em time',
  '{"team_id": "uuid", "changed_fields": ["name", "description"]}'::jsonb),
('team.archived', 'teams', 'Time arquivado', 'Time arquivado',
  '{"team_id": "uuid", "name": "Nome do Time"}'::jsonb),
('squad.created', 'teams', 'Squad criado', 'Squad criado dentro de um time',
  '{"squad_id": "uuid", "name": "Nome do Squad", "team_id": "uuid"}'::jsonb),
('squad.updated', 'teams', 'Squad atualizado', 'Alterações no squad',
  '{"squad_id": "uuid", "changed_fields": ["name", "description"]}'::jsonb),
('squad.archived', 'teams', 'Squad arquivado', 'Squad arquivado',
  '{"squad_id": "uuid", "name": "Nome do Squad"}'::jsonb),

-- OKRs
('okr.created', 'okrs', 'OKR criada', 'OKR criada (organizacional, time ou compartilhada)',
  '{"okr_id": "uuid", "title": "Título da OKR", "type": "team", "team_id": "uuid"}'::jsonb),
('okr.updated', 'okrs', 'OKR atualizada', 'Alterações estruturais na OKR',
  '{"okr_id": "uuid", "changed_fields": ["title", "description"]}'::jsonb),
('okr.archived', 'okrs', 'OKR arquivada', 'OKR encerrada ou arquivada',
  '{"okr_id": "uuid", "title": "Título da OKR"}'::jsonb),
('okr.shared', 'okrs', 'OKR compartilhada', 'OKR marcada como compartilhada entre times',
  '{"okr_id": "uuid", "shared_with_teams": ["uuid1", "uuid2"]}'::jsonb),
('okr.unshared', 'okrs', 'OKR não compartilhada', 'OKR deixou de ser compartilhada',
  '{"okr_id": "uuid"}'::jsonb),

-- KRs E CHECK-INS
('kr.created', 'krs', 'KR criada', 'Key Result criada',
  '{"kr_id": "uuid", "title": "Título da KR", "okr_id": "uuid", "target": 100}'::jsonb),
('kr.updated', 'krs', 'KR atualizada', 'Alterações na KR',
  '{"kr_id": "uuid", "changed_fields": ["title", "target"]}'::jsonb),
('kr.status.changed', 'krs', 'Status da KR alterado', 'Status da KR mudou (on track, at risk, off track)',
  '{"kr_id": "uuid", "old_status": "on_track", "new_status": "at_risk", "progress": 42}'::jsonb),
('kr.checkin.created', 'krs', 'Check-in realizado', 'Check-in realizado em uma KR',
  '{"kr_id": "uuid", "okr_id": "uuid", "old_value": 30, "new_value": 45, "progress": 45, "comment": "Comentário"}'::jsonb),
('kr.checkin.missed', 'krs', 'Check-in não realizado', 'Check-in não realizado dentro do prazo',
  '{"kr_id": "uuid", "okr_id": "uuid", "expected_at": "2026-01-04T00:00:00Z", "days_overdue": 3}'::jsonb),

-- KPIs
('kpi.created', 'kpis', 'KPI criada', 'Nova KPI criada',
  '{"kpi_id": "uuid", "name": "Nome da KPI", "category": "financeiro"}'::jsonb),
('kpi.updated', 'kpis', 'KPI atualizada', 'Configuração da KPI alterada',
  '{"kpi_id": "uuid", "changed_fields": ["name", "target"]}'::jsonb),
('kpi.value.updated', 'kpis', 'Valor da KPI atualizado', 'Valor da KPI atualizado (manual ou automático)',
  '{"kpi_id": "uuid", "old_value": 100, "new_value": 150, "source": "manual"}'::jsonb),
('kpi.outdated', 'kpis', 'KPI desatualizada', 'KPI sem atualização dentro da frequência esperada',
  '{"kpi_id": "uuid", "name": "Nome da KPI", "last_updated_at": "2026-01-01T00:00:00Z", "expected_frequency": "weekly"}'::jsonb),
('kpi.integration.failed', 'kpis', 'Integração falhou', 'Falha ao atualizar KPI automaticamente',
  '{"kpi_id": "uuid", "integration_key": "integration_name", "error": "Connection timeout"}'::jsonb),

-- AUTOMAÇÃO / SISTEMA
('automation.connection.created', 'automation', 'Conexão criada', 'Nova conexão de automação criada',
  '{"connection_id": "uuid", "name": "Nome da Conexão", "webhook_url": "https://..."}'::jsonb),
('automation.connection.activated', 'automation', 'Conexão ativada', 'Conexão de automação ativada',
  '{"connection_id": "uuid", "name": "Nome da Conexão"}'::jsonb),
('automation.connection.deactivated', 'automation', 'Conexão desativada', 'Conexão de automação desativada',
  '{"connection_id": "uuid", "name": "Nome da Conexão"}'::jsonb),
('automation.event.failed', 'automation', 'Evento falhou', 'Falha ao enviar evento para integração externa',
  '{"event_key": "okr.checkin.created", "connection_id": "uuid", "error": "HTTP 500"}'::jsonb),
('automation.event.retried', 'automation', 'Evento reprocessado', 'Evento reprocessado após falha',
  '{"event_key": "okr.checkin.created", "connection_id": "uuid", "retry_attempt": 2}'::jsonb);

-- =============================================
-- CATÁLOGO INICIAL DE AÇÕES
-- =============================================

INSERT INTO public.automation_action_catalog (action_key, category, name, description, required_fields, payload_example) VALUES
('kpi.update_value', 'kpis', 'Atualizar valor de KPI', 'Atualiza o valor atual de uma KPI',
  ARRAY['kpi_id', 'value'], '{"kpi_id": "uuid", "value": 150, "source": "n8n"}'::jsonb),
('notification.send', 'system', 'Enviar notificação', 'Envia uma notificação interna para usuários',
  ARRAY['user_ids', 'title', 'message'], '{"user_ids": ["uuid"], "title": "Título", "message": "Mensagem", "type": "info"}'::jsonb),
('kr.add_comment', 'krs', 'Adicionar comentário em KR', 'Adiciona um comentário em uma Key Result',
  ARRAY['kr_id', 'comment'], '{"kr_id": "uuid", "comment": "Comentário da automação"}'::jsonb),
('okr.mark_reviewed', 'okrs', 'Marcar OKR como revisada', 'Marca uma OKR como revisada externamente',
  ARRAY['okr_id'], '{"okr_id": "uuid", "reviewed_by": "external_system"}'::jsonb),
('log.create', 'system', 'Registrar log', 'Registra um log de automação externa',
  ARRAY['message'], '{"message": "Ação executada", "level": "info", "metadata": {}}'::jsonb),
('status.register', 'system', 'Registrar status externo', 'Registra um status vindo de sistema externo',
  ARRAY['entity_type', 'entity_id', 'status'], '{"entity_type": "deal", "entity_id": "123", "status": "won", "source": "crm"}'::jsonb);