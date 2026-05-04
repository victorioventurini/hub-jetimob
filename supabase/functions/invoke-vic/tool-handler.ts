// ============================================================================
// invoke-vic — tool call orchestration
// ============================================================================

import { executeHubTool } from "../_shared/hub-tools.ts";
import type { ToolCall } from "../_shared/llm-client.ts";
import { validateToolCallArgs } from "../_shared/validation.ts";
import type { EdgeSupabaseClient } from "../_shared/types/common.ts";

export interface ToolResult {
  role: string;
  tool_call_id: string;
  content: string;
}

export async function handleToolCalls(
  serviceClient: EdgeSupabaseClient,
  toolCalls: ToolCall[],
  buId: string,
  requestId: string,
): Promise<ToolResult[]> {
  const toolResults: ToolResult[] = [];

  for (const toolCall of toolCalls) {
    const args = validateToolCallArgs(toolCall.function.arguments);

    if (args === null) {
      console.error(
        `[${requestId}] Tool ${toolCall.function.name} has invalid arguments`,
      );
      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: `Erro: argumentos inválidos para ${toolCall.function.name}`,
      });
      continue;
    }

    try {
      const result = await executeHubTool(
        serviceClient,
        toolCall.function.name,
        args,
        buId,
      );
      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
      console.log(
        `[${requestId}] Tool ${toolCall.function.name} executed successfully`,
      );
    } catch (toolError) {
      console.error(
        `[${requestId}] Tool ${toolCall.function.name} failed:`,
        toolError,
      );
      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: `Erro ao executar ${toolCall.function.name}: ${
          toolError instanceof Error ? toolError.message : "Unknown error"
        }`,
      });
    }
  }

  return toolResults;
}
