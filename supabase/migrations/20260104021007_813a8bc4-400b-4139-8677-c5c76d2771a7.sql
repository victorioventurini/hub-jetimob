-- =============================================
-- VIC IA: Configuração por BU
-- =============================================

-- Adicionar coluna action_context na tabela de logs para rastrear de onde veio a chamada
ALTER TABLE public.ai_agent_logs 
ADD COLUMN IF NOT EXISTS action_context text;

-- Criar tabela de configuração de IA por BU
CREATE TABLE IF NOT EXISTS public.bu_ia_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE UNIQUE,
  ia_enabled boolean NOT NULL DEFAULT true,
  ia_mode text NOT NULL DEFAULT 'manual' CHECK (ia_mode IN ('manual', 'assisted')),
  max_calls_per_user_day integer DEFAULT NULL,
  max_calls_per_bu_day integer DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bu_ia_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their BU IA config"
  ON public.bu_ia_config FOR SELECT
  USING (user_has_bu_access(auth.uid(), bu_id) OR is_admin_or_ceo(auth.uid()));

CREATE POLICY "BU admins can manage their BU IA config"
  ON public.bu_ia_config FOR ALL
  USING (is_bu_admin(auth.uid(), bu_id) OR is_admin_or_ceo(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_bu_ia_config_updated_at
  BEFORE UPDATE ON public.bu_ia_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar slug aos agentes para facilitar identificação
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Atualizar slugs dos agentes existentes
UPDATE public.ai_agents SET slug = 'cultura' WHERE name = 'Guardião da Cultura';
UPDATE public.ai_agents SET slug = 'coach-okrs' WHERE name = 'Coach de OKRs';
UPDATE public.ai_agents SET slug = 'analista-kpis' WHERE name = 'Analista de KPIs';
UPDATE public.ai_agents SET slug = 'facilitador-decisoes' WHERE name = 'Facilitador de Decisões';
UPDATE public.ai_agents SET slug = 'alinhamento-estrategico' WHERE name = 'Alinhamento Estratégico';
UPDATE public.ai_agents SET slug = 'revisor-comunicacao' WHERE name = 'Revisor de comunicação interna';
UPDATE public.ai_agents SET slug = 'onboarding-buddy' WHERE name = 'Onboarding dos Jetimobers';
UPDATE public.ai_agents SET slug = 'vic-persona' WHERE name = 'Persona do Vic';
UPDATE public.ai_agents SET slug = 'vic-greeting' WHERE name = 'Persona do Vic | Agente de saudações do Hub';

-- Função para verificar se IA está habilitada para uma BU
CREATE OR REPLACE FUNCTION public.is_ia_enabled_for_bu(p_bu_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT ia_enabled FROM public.bu_ia_config WHERE bu_id = p_bu_id),
    true -- Por padrão, IA está habilitada
  )
$$;

-- Função para verificar se um agente específico está habilitado para uma BU
CREATE OR REPLACE FUNCTION public.is_agent_enabled_for_bu(p_bu_id uuid, p_agent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.bu_agent_activations WHERE bu_id = p_bu_id AND agent_id = p_agent_id),
    true -- Por padrão, agentes globais estão habilitados
  )
$$;

-- Função para contar chamadas do dia de um usuário
CREATE OR REPLACE FUNCTION public.count_user_calls_today(p_user_id uuid, p_bu_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.ai_agent_logs
  WHERE user_id = p_user_id
    AND bu_id = p_bu_id
    AND created_at >= CURRENT_DATE
$$;

-- Função para contar chamadas do dia de uma BU
CREATE OR REPLACE FUNCTION public.count_bu_calls_today(p_bu_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.ai_agent_logs
  WHERE bu_id = p_bu_id
    AND created_at >= CURRENT_DATE
$$;