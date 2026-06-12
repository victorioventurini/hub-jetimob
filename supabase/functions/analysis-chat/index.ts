/**
 * analysis-chat — CEO Copilot (read-only, BU-scoped)
 *
 * Conversational assistant on top of the strategic data of one BU.
 * Receives a thread of messages, runs an LLM tool-call loop reading from
 * OKRs / KPIs / Projects / Check-ins / Decisions, and returns the
 * assistant's final answer. Caller persists messages client-side via the
 * `analysis_messages` table (separate from the orchestration).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withMiddleware,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import {
  llmCompleteWithFallback,
  type LLMMessage,
  type ToolCall,
} from "../_shared/llm-client.ts";
import { TOOL_SCHEMAS, runTool, type ToolContext } from "./tools.ts";

const SYSTEM_PROMPT = `Você é o **Copiloto do CEO** dentro do Hub da Jet, exclusivo para a Business Unit ativa do usuário.

PRINCÍPIOS:
- Responde com rigor analítico: cruza dados, calcula tendências, identifica gargalos, propõe hipóteses.
- Use as ferramentas (tools) sempre que precisar de dados — NUNCA invente números, KRs, KPIs, ciclos ou times.
- Quando o usuário citar "Q1", "este time", "esse KPI" sem dar UUID, comece chamando \`list_cycles_and_teams\` para descobrir os IDs.
- Você pode encadear múltiplas tools no mesmo turno (até 10). Cruze OKRs com check-ins, KPIs com projetos, etc.
- Apresente respostas em **Markdown rico**: títulos, tabelas, listas, blocos de citação. Sempre que apresentar números, traga unidade e período.
- NUNCA produza ações de escrita. Você é somente leitura nesta versão. Se o usuário pedir "crie uma decisão", "atualize o KR", explique que ainda é só leitura e ofereça o rascunho como texto.
- Seja direto e executivo: prefira "O KR X está em 32%, ritmo abaixo do necessário para fechar Q2" do que parágrafos vagos.
- Se faltar dado, diga claramente "não encontrei isso na BU" — não tente preencher.

FORMATO:
- Comece com uma síntese de 1 a 3 linhas.
- Depois traga evidências (tabelas/listas).
- Termine com **próximos passos** quando a pergunta admitir ação.`;

const MAX_STEPS = 10;
const DEFAULT_MODEL = "google/gemini-2.5-pro";

interface ChatRequest {
  bu_id: string;
  thread_id?: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: string;
}

serve(async (req) => {
  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
    logRequest: true,
  });
  if (!mw.success) return mw.error!;

  const ctx = mw.context as RequestContext;
  const { requestId, serviceClient } = ctx;
  const buId = ctx.buId!;

  try {
    const body: ChatRequest = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return errorResponse("messages required", 400, { requestId, error: "MESSAGES_REQUIRED" });
    }

    // Optional gate via bu_ia_config
    const { data: iaConfig } = await serviceClient
      .from("bu_ia_config")
      .select("ia_enabled")
      .eq("bu_id", buId)
      .maybeSingle();
    if (iaConfig && iaConfig.ia_enabled === false) {
      return errorResponse("IA desativada para esta BU", 403, { requestId, error: "IA_DISABLED" });
    }

    const preferredModel = body.model || DEFAULT_MODEL;

    const llmMessages: LLMMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...body.messages.map((m) => ({
        role: m.role as LLMMessage["role"],
        content: m.content,
      })),
    ];

    const toolCtx: ToolContext = { svc: serviceClient, buId };
    const toolTrace: Array<{ name: string; args: unknown; ok: boolean; ms: number }> = [];

    let finalContent = "";
    let totalTokens = 0;

    for (let step = 0; step < MAX_STEPS; step++) {
      const resp = await llmCompleteWithFallback(serviceClient, preferredModel, llmMessages, {
        maxTokens: 3200,
        temperature: 0.4,
        tools: TOOL_SCHEMAS as unknown as Parameters<typeof llmCompleteWithFallback>[3] & {
          tools: unknown;
        }["tools"],
        toolChoice: "auto",
        timeoutMs: 90_000,
      });

      totalTokens += resp.usage?.totalTokens ?? 0;

      const toolCalls = resp.toolCalls;
      if (!toolCalls || toolCalls.length === 0) {
        finalContent = resp.content ?? "";
        break;
      }

      // Append assistant message with tool_calls intact
      llmMessages.push({
        role: "assistant",
        content: resp.content ?? "",
        // The raw message tool_calls are echoed back to the model via OpenAI-format
        // by pushing tool results below — provider keeps state via tool_call_id.
        // We store tool_calls on the message for the gateway to round-trip.
        // (LLMMessage type doesn't carry it, but the gateway accepts unknown props.)
        ...(resp.rawMessage as Record<string, unknown>),
      } as LLMMessage);

      for (const call of toolCalls as ToolCall[]) {
        const t0 = Date.now();
        const out = await runTool(call.function.name, call.function.arguments, toolCtx);
        const ms = Date.now() - t0;
        toolTrace.push({
          name: call.function.name,
          args: safeParse(call.function.arguments),
          ok: !out.error,
          ms,
        });
        // Compact output if too large
        const json = JSON.stringify(out);
        const content = json.length > 60_000 ? json.slice(0, 60_000) + "\n…[truncated]" : json;
        llmMessages.push({
          role: "tool",
          content,
          tool_call_id: call.id,
        });
      }
    }

    if (!finalContent) {
      finalContent = "Não consegui concluir a análise dentro do limite de passos. Tente reformular a pergunta de forma mais específica.";
    }

    logRequestCompletion(ctx, "success", `steps=${toolTrace.length} tokens=${totalTokens}`);

    return successResponse(
      {
        content: finalContent,
        tool_trace: toolTrace,
        model_used: preferredModel,
        tokens_total: totalTokens,
      },
      { requestId },
    );
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    const status = (err as { status?: number })?.status ?? 500;
    console.error(`[${requestId}] analysis-chat error:`, msg);
    logRequestCompletion(ctx, "error", msg);
    if (status === 429) return errorResponse("Rate limit", 429, { requestId, error: "RATE_LIMIT" });
    if (status === 402) return errorResponse("Sem créditos de IA", 402, { requestId, error: "NO_CREDITS" });
    return errorResponse(msg || "Erro interno", 500, { requestId, error: "INTERNAL" });
  }
});

function safeParse(raw: string): unknown {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return raw;
  }
}
