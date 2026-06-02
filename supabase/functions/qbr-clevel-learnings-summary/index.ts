/**
 * qbr-clevel-learnings-summary
 * 
 * Receives consolidated learnings from all team pre-QBR submissions
 * and generates an AI summary for each category (worked, didn't work, debts).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  withMiddleware,
  createServiceClient,
  type RequestContext,
} from "../_shared/middleware.ts";
import {
  successResponse,
  errorResponse,
} from "../_shared/response.ts";
import { resolveLLMConfig, llmComplete, type LLMMessage } from "../_shared/llm-client.ts";

// ============================================================================
// Types
// ============================================================================

interface LearningItem {
  text: string;
  teamName: string;
}

interface SummarizeRequest {
  bu_id: string;
  worked: LearningItem[];
  didntWork: LearningItem[];
  debts: LearningItem[];
}

interface SummaryResponse {
  workedSummary: string;
  didntWorkSummary: string;
  debtsSummary: string;
}

// ============================================================================
// Handler
// ============================================================================

async function handler(req: Request, ctx: RequestContext): Promise<Response> {
  const requestId = ctx.requestId;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, { requestId });
  }

  let body: SummarizeRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, { requestId });
  }

  const { worked = [], didntWork = [], debts = [] } = body;

  if (worked.length === 0 && didntWork.length === 0 && debts.length === 0) {
    return successResponse<SummaryResponse>({
      workedSummary: "",
      didntWorkSummary: "",
      debtsSummary: "",
    });
  }

  // Resolve LLM config
  const llmConfig = await resolveLLMConfig(ctx.serviceClient, "google/gemini-3.5-flash");
  if (!llmConfig) {
    console.error(`[${requestId}] No AI configuration available`);
    return errorResponse("AI service not configured", 500, { requestId, error: "AI_NOT_CONFIGURED" });
  }

  // Override defaults for summary tasks
  llmConfig.maxTokens = 1200;
  llmConfig.temperature = 0.4;

  const formatItems = (items: LearningItem[]) =>
    items.map(i => `- [${i.teamName}]: ${i.text}`).join("\n");

  const systemPrompt = `Você é um analista estratégico que sintetiza aprendizados trimestrais de múltiplos times.
Seu objetivo é gerar um resumo executivo conciso (2-4 frases) para cada categoria de aprendizado.
O resumo deve:
- Identificar padrões transversais entre os times
- Destacar insights acionáveis
- Usar linguagem objetiva e direta
- Não repetir os nomes dos times no resumo
Responda APENAS em português brasileiro.
Responda em formato JSON com as chaves: workedSummary, didntWorkSummary, debtsSummary.
Se uma categoria estiver vazia, retorne string vazia para ela.`;

  const userPrompt = `Resuma os aprendizados consolidados dos times:

=== O QUE FUNCIONOU (Manter) ===
${worked.length > 0 ? formatItems(worked) : "(nenhum registro)"}

=== O QUE NÃO FUNCIONOU (Parar) ===
${didntWork.length > 0 ? formatItems(didntWork) : "(nenhum registro)"}

=== DÍVIDAS TÉCNICAS/PROCESSUAIS ===
${debts.length > 0 ? formatItems(debts) : "(nenhum registro)"}`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await llmComplete(llmConfig, messages, {
      maxTokens: 1200,
      temperature: 0.4,
    });

    if (!response.content) {
      console.error(`[${requestId}] Empty LLM response`);
      return errorResponse("Empty AI response", 500, { requestId });
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsed: SummaryResponse;
    try {
      let jsonStr = response.content.trim();
      // Strip markdown code fences if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error(`[${requestId}] Failed to parse LLM JSON:`, response.content);
      return errorResponse("Failed to parse AI response", 500, { requestId });
    }

    return successResponse<SummaryResponse>({
      workedSummary: parsed.workedSummary || "",
      didntWorkSummary: parsed.didntWorkSummary || "",
      debtsSummary: parsed.debtsSummary || "",
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    console.error(`[${requestId}] LLM call failed:`, error.message);

    if (error.status === 429) {
      return errorResponse("Rate limit exceeded, try again later", 429, { requestId });
    }
    if (error.status === 402) {
      return errorResponse("AI credits exhausted", 402, { requestId });
    }

    return errorResponse("AI service error", 500, { requestId, error: error.message });
  }
}

// ============================================================================
// Serve
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: false,
  });

  if (!mw.success) return mw.error!;

  return handler(req, mw.context!);
});
