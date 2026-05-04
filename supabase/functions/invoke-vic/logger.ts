// ============================================================================
// invoke-vic — agent invocation logger
// ============================================================================

import type { EdgeSupabaseClient } from "../_shared/types/common.ts";

export interface AgentInvocationLog {
  agentId: string | null;
  agentName: string;
  scope: string;
  buId: string;
  userId: string;
  integrationKey: string;
  actionContext: string;
  status: "success" | "error";
  modelUsed?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  errorMessage?: string;
  latencyMs: number;
}

export async function logAgentInvocation(
  serviceClient: EdgeSupabaseClient,
  params: AgentInvocationLog,
): Promise<void> {
  await serviceClient.from("ai_agent_logs").insert({
    agent_id: params.agentId,
    agent_name: params.agentName,
    scope: params.scope,
    bu_id: params.buId,
    user_id: params.userId,
    integration_key: params.integrationKey,
    action_context: params.actionContext,
    status: params.status,
    model_used: params.modelUsed,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    total_tokens: params.totalTokens,
    error_message: params.errorMessage,
    latency_ms: params.latencyMs,
  });
}
