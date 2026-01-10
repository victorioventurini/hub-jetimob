import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  logRequestCompletion,
  checkRateLimits,
  createServiceClient,
  withMiddleware,
  type RequestContext,
} from "../_shared/middleware.ts";
import {
  loadInstructionSources,
  assembleInstructionContent,
} from "../_shared/instruction-sources.ts";
import {
  HUB_TOOL_DEFINITIONS,
  executeHubTool,
} from "../_shared/hub-tools.ts";

// Get integration API key from hub_integrations_global_config
async function getIntegrationApiKey(
  serviceClient: any,
  integrationKey: string
): Promise<string | null> {
  const { data, error } = await serviceClient
    .from("hub_integrations_global_config")
    .select("config_encrypted, is_enabled_global")
    .eq("integration_key", integrationKey)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching ${integrationKey} config:`, error);
    return null;
  }

  if (!data || !data.is_enabled_global) {
    return null;
  }

  const config = data.config_encrypted as { api_key?: string } | null;
  return config?.api_key || null;
}

// Mapeamento de slugs para nomes de agentes
const AGENT_SLUGS: Record<string, string> = {
  cultura: "Guardião da Cultura",
  "coach-okrs": "Coach de OKRs",
  "analista-kpis": "Analista de KPIs",
  "facilitador-decisoes": "Facilitador de Decisões",
  "alinhamento-estrategico": "Alinhamento Estratégico",
  "revisor-comunicacao": "Revisor de comunicação interna",
  "onboarding-buddy": "Onboarding dos Jetimobers",
};

// Prompt base da Persona do Vic que todos os agentes herdam
const VIC_PERSONA_INTRO = `Você é o Vic, a personificação da forma de pensar da Jetimob.

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

interface InvokeVicRequest {
  agentSlug: string;
  buId?: string;
  userId?: string;
  actionContext: string;
  context: {
    type: string;
    title?: string;
    description?: string;
    currentValue?: number;
    targetValue?: number;
    baselineValue?: number;
    unit?: string;
    status?: string;
    additionalData?: Record<string, unknown>;
  };
  userQuestion?: string;
}

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

type AgentRow = {
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

serve(async (req) => {
  // NOTE: verify_jwt is disabled for this function in config.toml.
  // We validate JWT (signing keys) + BU access + correlation-id via middleware.
  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
    logRequest: true,
  });

  if (!mw.success) {
    return mw.error!;
  }

  const ctx = mw.context as RequestContext;
  const requestId = ctx.requestId;
  const startTime = ctx.startTime;
  const userId = ctx.user!.id;
  const buId = ctx.buId!;
  const serviceClient = ctx.serviceClient;

  let agentId: string | null = null;
  let agentName = "unknown";

  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const body: InvokeVicRequest = await req.json();
    const { agentSlug, actionContext, context: aiContext, userQuestion } = body;

    console.log(`[${requestId}] Invoke VIC: agent=${agentSlug}, user=${userId}, bu=${buId}`);

    if (!agentSlug || !actionContext) {
      return errorResponse("agentSlug and actionContext are required", 400, {
        requestId,
        error: "MISSING_PARAMS",
      });
    }

    // Rate limits (BU-scoped)
    const rateLimitError = await checkRateLimits(serviceClient, userId, buId, {}, requestId);
    if (rateLimitError) return rateLimitError;

    // AI provider selection
    const openAIApiKey = await getIntegrationApiKey(serviceClient, "chatgpt");
    const useOpenAI = !!openAIApiKey;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!openAIApiKey && !lovableApiKey) {
      console.error(`[${requestId}] No AI API key configured (ChatGPT integration or LOVABLE_API_KEY fallback)`);
      return errorResponse("AI service not configured", 500, { requestId, error: "AI_NOT_CONFIGURED" });
    }

    // Fetch agent by slug (no select('*'))
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
      console.error(`[${requestId}] Agent not found:`, agentSlug);
      return errorResponse("Agent not found", 404, { requestId, error: "AGENT_NOT_FOUND" });
    }

    agentId = agent.id;
    agentName = agent.name;

    // Check activation for this BU
    const { data: activation, error: activationError } = await serviceClient
      .from("bu_agent_activations")
      .select("is_enabled, custom_system_prompt")
      .eq("bu_id", buId)
      .eq("agent_id", agent.id)
      .maybeSingle();

    if (activationError) {
      console.error(`[${requestId}] Error fetching agent activation:`, activationError.message);
      return errorResponse("Internal error", 500, { requestId, error: "AGENT_ACTIVATION_FETCH_FAILED" });
    }

    if (activation?.is_enabled === false) {
      return errorResponse("Agent is disabled for this BU", 403, {
        requestId,
        error: "AGENT_DISABLED",
        code: "AGENT_DISABLED",
      });
    }

    const effectiveSystemPrompt = activation?.custom_system_prompt || agent.system_prompt;

    // =========================================================================
    // LOAD INSTRUCTION SOURCES
    // =========================================================================
    console.log(`[${requestId}] Loading instruction sources for agent ${agentId}`);

    const instructionSources = await loadInstructionSources(serviceClient, agent.id);
    let instructionContent = "";

    if (instructionSources.length > 0) {
      console.log(`[${requestId}] Found ${instructionSources.length} instruction sources`);
      instructionContent = await assembleInstructionContent(serviceClient, instructionSources, buId);
    }

    // Knowledge base documents
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
      knowledgeBase = (documents as any[])
        .filter((doc) => doc.extracted_content)
        .map((doc) => `=== ${doc.name} ===\n${doc.extracted_content}`)
        .join("\n\n");
    }

    // Build system prompt
    let systemPrompt = VIC_PERSONA_INTRO + effectiveSystemPrompt;

    if (knowledgeBase) {
      systemPrompt += `\n\n=== BASE DE CONHECIMENTO (Documentos) ===\n${knowledgeBase}`;
    }

    if (instructionContent) {
      systemPrompt += instructionContent;
    }

    // Build context description
    let contextDescription = `Contexto: ${aiContext.type}`;
    if (aiContext.title) contextDescription += `\nTítulo: ${aiContext.title}`;
    if (aiContext.description) contextDescription += `\nDescrição: ${aiContext.description}`;
    if (aiContext.currentValue !== undefined)
      contextDescription += `\nValor atual: ${aiContext.currentValue}${aiContext.unit || ""}`;
    if (aiContext.targetValue !== undefined)
      contextDescription += `\nMeta: ${aiContext.targetValue}${aiContext.unit || ""}`;
    if (aiContext.baselineValue !== undefined)
      contextDescription += `\nBaseline: ${aiContext.baselineValue}${aiContext.unit || ""}`;
    if (aiContext.status) contextDescription += `\nStatus: ${aiContext.status}`;
    if (aiContext.additionalData) {
      contextDescription += `\nDados adicionais: ${JSON.stringify(aiContext.additionalData, null, 2)}`;
    }

    // Build user prompt
    let userPrompt = contextDescription;
    if (userQuestion) {
      userPrompt += `\n\nPergunta do usuário: ${userQuestion}`;
    } else {
      userPrompt += `\n\nAnalise o contexto acima e forneça suas recomendações.`;
    }

    console.log(`[${requestId}] Invoking agent: ${agentName} (${agentSlug}) for context: ${actionContext}`);

    const apiUrl = useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useOpenAI ? openAIApiKey : lovableApiKey;

    const modelName = useOpenAI
      ? agent.model_name && agent.model_name.startsWith("gpt")
        ? agent.model_name
        : "gpt-4o-mini"
      : agent.model_name || "google/gemini-2.5-flash";

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const requestPayload: any = {
      model: modelName,
      messages,
      max_tokens: agent.max_tokens || 800,
      temperature: agent.temperature ?? 0.7,
    };

    // Tools (only when BU context is available)
    const allowedTools = Array.isArray(agent.allowed_tools)
      ? (agent.allowed_tools as string[])
      : null;

    if (allowedTools?.length) {
      const hubToolNames = HUB_TOOL_DEFINITIONS.map((t) => t.function.name);
      const agentTools = allowedTools.filter((t) => hubToolNames.includes(t));

      if (agentTools.length > 0) {
        requestPayload.tools = HUB_TOOL_DEFINITIONS.filter((t) =>
          agentTools.includes(t.function.name)
        );
        requestPayload.tool_choice = "auto";
        console.log(`[${requestId}] Agent has ${agentTools.length} tools enabled: ${agentTools.join(", ")}`);
      }
    }

    // First API call
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] AI API error:`, response.status, errorText);

      await serviceClient.from("ai_agent_logs").insert({
        agent_id: agentId,
        agent_name: agentName,
        scope: agent.scope,
        bu_id: buId,
        user_id: userId,
        integration_key: agent.integration_key,
        action_context: actionContext,
        status: "error",
        error_message: `AI API error: ${response.status}`,
        latency_ms: Date.now() - startTime,
      });

      if (response.status === 429) {
        return errorResponse("Rate limit exceeded", 429, { requestId, error: "RATE_LIMIT", code: "RATE_LIMIT" });
      }
      if (response.status === 402) {
        return errorResponse("AI credits depleted", 402, { requestId, error: "NO_CREDITS", code: "NO_CREDITS" });
      }

      return errorResponse("AI API error", 502, { requestId, error: "AI_API_ERROR" });
    }

    let data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    const toolCalls = data.choices?.[0]?.message?.tool_calls as ToolCall[] | undefined;

    // Handle tool calls
    if (toolCalls?.length) {
      console.log(`[${requestId}] Processing ${toolCalls.length} tool calls`);

      const toolResults: { role: string; tool_call_id: string; content: string }[] = [];

      for (const toolCall of toolCalls) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeHubTool(serviceClient, toolCall.function.name, args, buId);

          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });

          console.log(`[${requestId}] Tool ${toolCall.function.name} executed successfully`);
        } catch (toolError) {
          console.error(`[${requestId}] Tool ${toolCall.function.name} failed:`, toolError);
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: `Erro ao executar ${toolCall.function.name}: ${toolError instanceof Error ? toolError.message : "Unknown error"}`,
          });
        }
      }

      const secondMessages = [
        ...messages,
        data.choices[0].message,
        ...toolResults,
      ];

      const secondResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: secondMessages,
          max_tokens: agent.max_tokens || 800,
          temperature: agent.temperature ?? 0.7,
        }),
      });

      if (secondResponse.ok) {
        const secondData = await secondResponse.json();
        content = secondData.choices?.[0]?.message?.content || content;

        if (secondData.usage) {
          data.usage = {
            prompt_tokens: (data.usage?.prompt_tokens || 0) + (secondData.usage?.prompt_tokens || 0),
            completion_tokens:
              (data.usage?.completion_tokens || 0) + (secondData.usage?.completion_tokens || 0),
            total_tokens: (data.usage?.total_tokens || 0) + (secondData.usage?.total_tokens || 0),
          };
        }
      }
    }

    if (!content) {
      return errorResponse("Empty response from AI", 502, { requestId, error: "EMPTY_AI_RESPONSE" });
    }

    const latencyMs = Date.now() - startTime;

    await serviceClient.from("ai_agent_logs").insert({
      agent_id: agentId,
      agent_name: agentName,
      scope: agent.scope,
      bu_id: buId,
      user_id: userId,
      integration_key: agent.integration_key,
      action_context: actionContext,
      status: "success",
      model_used: modelName,
      input_tokens: data.usage?.prompt_tokens,
      output_tokens: data.usage?.completion_tokens,
      total_tokens: data.usage?.total_tokens,
      latency_ms: latencyMs,
    });

    console.log(`[${requestId}] Agent ${agentName} responded successfully in ${latencyMs}ms`);

    logRequestCompletion(ctx, "success");

    return jsonResponse({
      response: content,
      agentName,
      agentSlug,
      tokensUsed: data.usage?.total_tokens,
      latencyMs,
    });
  } catch (error) {
    console.error(`[${requestId}] Error in invoke-vic function:`, error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    try {
      // Best-effort log
      const serviceClientFallback = createServiceClient();
      await serviceClientFallback.from("ai_agent_logs").insert({
        agent_id: agentId,
        agent_name: agentName,
        scope: "global",
        integration_key: "invoke-vic",
        action_context: "error",
        status: "error",
        error_message: errorMessage,
        latency_ms: Date.now() - startTime,
      });
    } catch (logError) {
      console.error(`[${requestId}] Failed to log error:`, logError);
    }

    logRequestCompletion(ctx, "error", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
