/**
 * Agent Loader - Load and configure AI agents
 */

import { loadInstructionSources, assembleInstructionContent } from "./instruction-sources.ts";

// Vic persona intro - inherited by all agents
export const VIC_PERSONA_INTRO = `Você é o Vic, a personificação da forma de pensar da Jetimob.

Seu tom é:
- Direto e humano (sem firulas corporativas)
- Construtivo e acionável (sempre sugere próximos passos)
- Leve mas assertivo (usa humor sutil quando apropriado)
- Conciso (respostas curtas e objetivas)

Regras gerais:
- Nunca use linguagem genérica de IA ("Claro!", "Com certeza!", etc.)
- Seja específico e contextual
- Limite respostas a 3-4 parágrafos no máximo
- Quando possível, use bullet points

`;

// Legacy slug to name mapping (for backward compatibility)
const AGENT_SLUGS: Record<string, string> = {
  cultura: "Guardião da Cultura",
  "coach-okrs": "Coach de OKRs",
  "analista-kpis": "Analista de KPIs",
  "facilitador-decisoes": "Facilitador de Decisões",
  "alinhamento-estrategico": "Alinhamento Estratégico",
  "revisor-comunicacao": "Revisor de comunicação interna",
  "onboarding-buddy": "Onboarding dos Jetimobers",
};

export type AgentRow = {
  id: string;
  name: string;
  slug: string | null;
  scope: string;
  model_name: string | null;
  integration_key: string;
  system_prompt: string;
  temperature: number | null;
  max_tokens: number | null;
  allowed_tools: unknown | null;
  is_active: boolean;
};

const AGENT_SELECT =
  "id, name, slug, scope, model_name, integration_key, system_prompt, temperature, max_tokens, allowed_tools, is_active";

export interface LoadedAgent {
  agent: AgentRow;
  effectiveSystemPrompt: string;
  isEnabledInBu: boolean;
  customPrompt: string | null;
}

export interface AgentContext {
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

/**
 * Load agent by slug with BU activation check
 */
export async function loadAgent(
  serviceClient: any,
  agentSlug: string,
  buId: string,
  requestId: string
): Promise<LoadedAgent | null> {
  // Try by slug first
  let agent: AgentRow | null = null;
  const { data: agentBySlug, error: agentSlugError } = await serviceClient
    .from("ai_agents")
    .select(AGENT_SELECT)
    .eq("slug", agentSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!agentSlugError && agentBySlug) {
    agent = agentBySlug as AgentRow;
  } else {
    // Fallback by name
    const agentNameFromSlug = AGENT_SLUGS[agentSlug];
    if (agentNameFromSlug) {
      const { data: agentByName } = await serviceClient
        .from("ai_agents")
        .select(AGENT_SELECT)
        .eq("name", agentNameFromSlug)
        .eq("is_active", true)
        .maybeSingle();
      if (agentByName) agent = agentByName as AgentRow;
    }
  }

  if (!agent) {
    console.error(`[${requestId}] Agent not found: ${agentSlug}`);
    return null;
  }

  // Check activation for this BU
  const { data: activation, error: activationError } = await serviceClient
    .from("bu_agent_activations")
    .select("is_enabled, custom_system_prompt")
    .eq("bu_id", buId)
    .eq("agent_id", agent.id)
    .maybeSingle();

  if (activationError) {
    console.error(`[${requestId}] Error fetching agent activation:`, activationError.message);
    throw new Error("AGENT_ACTIVATION_FETCH_FAILED");
  }

  return {
    agent,
    effectiveSystemPrompt: activation?.custom_system_prompt || agent.system_prompt,
    isEnabledInBu: activation?.is_enabled !== false, // Default to enabled
    customPrompt: activation?.custom_system_prompt || null,
  };
}

/**
 * Build the complete system prompt for an agent
 */
export async function buildSystemPrompt(
  serviceClient: any,
  agent: AgentRow,
  effectiveSystemPrompt: string,
  buId: string,
  requestId: string
): Promise<string> {
  // Load instruction sources
  console.log(`[${requestId}] Loading instruction sources for agent ${agent.id}`);
  const instructionSources = await loadInstructionSources(serviceClient, agent.id);
  let instructionContent = "";

  if (instructionSources.length > 0) {
    console.log(`[${requestId}] Found ${instructionSources.length} instruction sources`);
    instructionContent = await assembleInstructionContent(serviceClient, instructionSources, buId);
  }

  // Load knowledge base documents
  const { data: documents, error: documentsError } = await serviceClient
    .from("ai_agent_documents")
    .select("name, extracted_content")
    .eq("agent_id", agent.id)
    .eq("status", "ready");

  if (documentsError) {
    console.error(`[${requestId}] Error fetching agent documents:`, documentsError.message);
  }

  let knowledgeBase = "";
  if (documents && documents.length > 0) {
    knowledgeBase = (documents as { name: string; extracted_content: string | null }[])
      .filter((doc) => doc.extracted_content)
      .map((doc) => `=== ${doc.name} ===\n${doc.extracted_content}`)
      .join("\n\n");
  }

  // Assemble final prompt
  let systemPrompt = VIC_PERSONA_INTRO + effectiveSystemPrompt;

  if (knowledgeBase) {
    systemPrompt += `\n\n=== BASE DE CONHECIMENTO (Documentos) ===\n${knowledgeBase}`;
  }

  if (instructionContent) {
    systemPrompt += instructionContent;
  }

  return systemPrompt;
}

/**
 * Build user prompt from context
 */
export function buildUserPrompt(context: AgentContext, userQuestion?: string): string {
  let contextDescription = `Contexto: ${context.type}`;
  
  if (context.title) contextDescription += `\nTítulo: ${context.title}`;
  if (context.description) contextDescription += `\nDescrição: ${context.description}`;
  if (context.currentValue !== undefined)
    contextDescription += `\nValor atual: ${context.currentValue}${context.unit || ""}`;
  if (context.targetValue !== undefined)
    contextDescription += `\nMeta: ${context.targetValue}${context.unit || ""}`;
  if (context.baselineValue !== undefined)
    contextDescription += `\nBaseline: ${context.baselineValue}${context.unit || ""}`;
  if (context.status) contextDescription += `\nStatus: ${context.status}`;
  if (context.additionalData) {
    contextDescription += `\nDados adicionais: ${JSON.stringify(context.additionalData, null, 2)}`;
  }

  if (userQuestion) {
    return `${contextDescription}\n\nPergunta do usuário: ${userQuestion}`;
  }
  
  return `${contextDescription}\n\nAnalise o contexto acima e forneça suas recomendações.`;
}

/**
 * Get allowed tools for an agent
 */
export function getAgentTools(agent: AgentRow): string[] | null {
  return Array.isArray(agent.allowed_tools) ? (agent.allowed_tools as string[]) : null;
}
