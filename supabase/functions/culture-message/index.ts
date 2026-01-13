/**
 * Culture Message Edge Function
 * 
 * Generates culture-aligned messages for the Hub home page using Lovable AI.
 * Uses _shared modules for consistent patterns.
 */

import { 
  corsHeaders, 
  createServiceClient,
  jsonResponse,
  errorResponse,
} from "../_shared/middleware.ts";

const AGENT_NAME = "Guardião da Cultura";

interface AgentRow {
  id: string;
  scope: string;
  bu_id: string | null;
  integration_key: string;
  name: string;
  system_prompt: string;
  output_format: string;
  model_name: string | null;
  max_tokens: number | null;
  temperature: number | null;
}

interface DocumentRow {
  name: string;
  extracted_content: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get("x-correlation-id") || crypto.randomUUID();
  const startTime = Date.now();

  try {
    console.log(`[${requestId}] culture-message: Starting request`);

    const supabase = createServiceClient();

    // Optional request body (used to help the model avoid repetition)
    let recentMessages: string[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.recentMessages)) {
        recentMessages = body.recentMessages
          .filter((m: unknown): m is string => typeof m === "string" && m.trim().length > 0)
          .slice(0, 20);
      }
    } catch {
      // no body - that's fine
    }

    // Get the Guardião da Cultura agent
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("id, scope, bu_id, integration_key, name, system_prompt, output_format, model_name, max_tokens, temperature")
      .eq("name", AGENT_NAME)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      console.warn(`[${requestId}] Agent not found: ${AGENT_NAME}`, agentError?.message);
      return errorResponse("Culture agent not found", 404, { requestId, error: "AGENT_NOT_FOUND" });
    }

    const typedAgent = agent as AgentRow;

    // Get agent documents (knowledge base)
    const { data: documents } = await supabase
      .from("ai_agent_documents")
      .select("name, extracted_content")
      .eq("agent_id", typedAgent.id)
      .eq("status", "completed");

    // Build knowledge base context
    let knowledgeBase = "";
    if (documents && documents.length > 0) {
      const typedDocs = documents as DocumentRow[];
      knowledgeBase = typedDocs
        .filter((doc) => doc.extracted_content)
        .map((doc) => `=== ${doc.name} ===\n${doc.extracted_content}`)
        .join("\n\n");
    }

    // Get current date for context
    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const repetitionBlock = recentMessages.length
      ? `\n\nEVITE REPETIR qualquer uma destas mensagens recentes (use outra ideia/ângulo):\n- ${recentMessages.join("\n- ")}`
      : "";

    // Build the prompt for generating a culture message
    const userPrompt = `
Hoje é ${dateStr}.\n
Gere UMA mensagem de cultura para exibir na Home do Hub da Jetimob.\n
REGRAS:\n- Máximo 180 caracteres\n- Linguagem humana e direta\n- Ligada a um valor ou ao propósito\n- Incentive ação ou reflexão prática\n- Não use emojis em excesso (máximo 1 se necessário)\n- Não soe como mensagem automática de sistema\n- Não repita textos literais do manual\n- Pode usar expressões como "buenas" em contextos leves\n
${repetitionBlock}\n
ID DE VARIAÇÃO: ${requestId}\n
FORMATO DE RESPOSTA:\nRetorne APENAS a mensagem, sem aspas, sem explicações adicionais.\n`;

    const systemPrompt = `${typedAgent.system_prompt}

${knowledgeBase ? `\n\n=== BASE DE CONHECIMENTO ===\n${knowledgeBase}` : ""}`;

    // Get LOVABLE_API_KEY for the AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      console.error(`[${requestId}] LOVABLE_API_KEY not configured`);
      return errorResponse("AI service not configured", 500, { requestId, error: "AI_NOT_CONFIGURED" });
    }

    console.log(`[${requestId}] Calling Lovable AI Gateway...`);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[${requestId}] AI Gateway error: ${aiResponse.status}`, errorText);
      
      if (aiResponse.status === 429) {
        return errorResponse("Rate limit exceeded, try again later", 429, { requestId, error: "RATE_LIMITED" });
      }
      if (aiResponse.status === 402) {
        return errorResponse("AI credits depleted", 402, { requestId, error: "CREDITS_DEPLETED" });
      }
      
      return errorResponse("Failed to generate culture message", 500, { requestId, error: "AI_CALL_FAILED" });
    }

    const data = await aiResponse.json();
    const message = data.choices?.[0]?.message?.content?.trim() || "";

    if (!message) {
      console.warn(`[${requestId}] Empty response from AI`);
      return errorResponse("Empty response from AI", 500, { requestId, error: "EMPTY_RESPONSE" });
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[${requestId}] Culture message generated in ${latencyMs}ms:`, message.substring(0, 50) + "...");

    // Log the execution
    await supabase.from("ai_agent_logs").insert({
      agent_id: typedAgent.id,
      agent_name: typedAgent.name,
      scope: typedAgent.scope,
      integration_key: typedAgent.integration_key,
      status: "success",
      model_used: "google/gemini-2.5-flash",
      input_tokens: data.usage?.prompt_tokens,
      output_tokens: data.usage?.completion_tokens,
      total_tokens: data.usage?.total_tokens,
      latency_ms: latencyMs,
    });

    return jsonResponse({ 
      message,
      generatedAt: now.toISOString(),
    });

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error(`[${requestId}] Error in ${latencyMs}ms:`, error instanceof Error ? error.message : "Unknown error");
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500,
      { requestId, error: "INTERNAL_ERROR" }
    );
  }
});
