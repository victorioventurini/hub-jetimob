-- Enum para tipos de fonte de instrução
CREATE TYPE instruction_source_type AS ENUM ('api', 'document', 'hub_context', 'template');

-- Tabela principal de fontes de instrução dos agentes
CREATE TABLE public.ai_agent_instruction_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  source_type instruction_source_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INT NOT NULL DEFAULT 100,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Configuração específica por tipo (JSON)
  -- Para 'api': { url, method, headers_encrypted, body_template, refresh_interval_seconds, auth_type }
  -- Para 'document': { document_ids: [...] }
  -- Para 'hub_context': { tables: ['okrs', 'kpis', 'teams'], filters: {...}, max_rows: 50 }
  -- Para 'template': { template_content: "..." }
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Cache de conteúdo buscado
  last_fetch_at TIMESTAMPTZ,
  last_fetch_status TEXT CHECK (last_fetch_status IN ('success', 'error', 'pending')),
  last_fetch_error TEXT,
  cached_content TEXT,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_ai_agent_instruction_sources_agent ON public.ai_agent_instruction_sources(agent_id);
CREATE INDEX idx_ai_agent_instruction_sources_enabled ON public.ai_agent_instruction_sources(agent_id, is_enabled) WHERE is_enabled = true;

-- Trigger para updated_at
CREATE TRIGGER update_ai_agent_instruction_sources_updated_at
BEFORE UPDATE ON public.ai_agent_instruction_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.ai_agent_instruction_sources ENABLE ROW LEVEL SECURITY;

-- Políticas RLS usando is_platform_admin()
CREATE POLICY "Platform admins can view instruction sources"
ON public.ai_agent_instruction_sources
FOR SELECT
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert instruction sources"
ON public.ai_agent_instruction_sources
FOR INSERT
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update instruction sources"
ON public.ai_agent_instruction_sources
FOR UPDATE
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete instruction sources"
ON public.ai_agent_instruction_sources
FOR DELETE
USING (is_platform_admin(auth.uid()));

-- Comentários
COMMENT ON TABLE public.ai_agent_instruction_sources IS 'Fontes de instrução configuráveis para agentes IA (APIs, documentos, contexto HUB)';
COMMENT ON COLUMN public.ai_agent_instruction_sources.source_type IS 'Tipo: api (externa), document (uploads), hub_context (dados internos), template (texto fixo)';
COMMENT ON COLUMN public.ai_agent_instruction_sources.priority IS 'Ordem de prioridade (menor = mais prioritário)';
COMMENT ON COLUMN public.ai_agent_instruction_sources.config IS 'Configuração JSON específica por tipo de fonte';