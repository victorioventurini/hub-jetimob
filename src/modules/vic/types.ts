// Types for Vic IA module

export type VicAgentSlug =
  | "cultura"
  | "coach-okrs"
  | "analista-kpis"
  | "facilitador-decisoes"
  | "alinhamento-estrategico"
  | "revisor-comunicacao"
  | "onboarding-buddy"
  | "coach-produtividade";

export type VicActionContext =
  | "dashboard-culture"
  | "dashboard-productivity"
  | "dashboard-okrs"
  | "dashboard-kpis"
  | "dashboard-decision"
  | "okr-create-objective"
  | "okr-edit-objective"
  | "okr-create-kr"
  | "okr-edit-kr"
  | "okr-review-quality"
  | "okr-check-alignment"
  | "okr-initiative-review"
  | "okr-analysis-improvement"
  | "okr-overview-insights"
  | "okr-gap-resolution"
  | "kpi-create"
  | "kpi-edit"
  | "kpi-analyze-variation"
  | "kpi-monthly-summary"
  | "comms-review"
  | "comms-pre-publish"
  | "onboarding-welcome"
  | "onboarding-questions"
  | "decision-structure"
  | "vic-test-page";

export interface VicContext {
  type: string;
  title?: string;
  description?: string;
  currentValue?: number;
  targetValue?: number;
  baselineValue?: number;
  unit?: string;
  status?: string;
  additionalData?: Record<string, unknown>;
}

export interface VicInvokeRequest {
  agentSlug: VicAgentSlug;
  buId?: string;
  actionContext: VicActionContext;
  context: VicContext;
  userQuestion?: string;
}

export interface VicInvokeResponse {
  response: string;
  agentName: string;
  agentSlug: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export interface VicError {
  error: string;
  code?: 
    | "IA_DISABLED" 
    | "AGENT_DISABLED" 
    | "USER_LIMIT_REACHED" 
    | "BU_LIMIT_REACHED" 
    | "RATE_LIMIT" 
    | "NO_CREDITS";
  limit?: number;
}

export interface BuIaConfig {
  id: string;
  bu_id: string;
  ia_enabled: boolean;
  ia_mode: "manual" | "assisted";
  max_calls_per_user_day: number | null;
  max_calls_per_bu_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface AgentActivation {
  id: string;
  bu_id: string;
  agent_id: string;
  is_enabled: boolean;
  custom_system_prompt: string | null;
  enabled_by: string | null;
  created_at: string;
  updated_at: string;
}

// Agent display info for UI
export const VIC_AGENTS: Record<VicAgentSlug, { name: string; description: string; icon: string }> = {
  "cultura": {
    name: "Guardião da Cultura",
    description: "Cria mensagens inspiradoras alinhadas aos valores",
    icon: "Heart",
  },
  "coach-okrs": {
    name: "Coach de OKRs",
    description: "Ajuda a escrever objetivos e KRs claros e mensuráveis",
    icon: "Target",
  },
  "analista-kpis": {
    name: "Analista de KPIs",
    description: "Interpreta métricas e sugere ações",
    icon: "BarChart3",
  },
  "facilitador-decisoes": {
    name: "Facilitador de Decisões",
    description: "Estrutura decisões e avalia trade-offs",
    icon: "Scale",
  },
  "alinhamento-estrategico": {
    name: "Alinhamento Estratégico",
    description: "Identifica desalinhamentos e conflitos",
    icon: "GitBranch",
  },
  "revisor-comunicacao": {
    name: "Revisor de Comunicação",
    description: "Revisa clareza e tom de comunicados",
    icon: "MessageSquare",
  },
  "onboarding-buddy": {
    name: "Onboarding Buddy",
    description: "Ajuda novos Jetimobers a se integrar",
    icon: "Handshake",
  },
  "coach-produtividade": {
    name: "Coach de Produtividade",
    description: "Gera dicas personalizadas baseadas no contexto do usuário",
    icon: "Lightbulb",
  },
};
