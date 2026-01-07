import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  corsHeaders, 
  jsonResponse, 
  errorResponse,
  logRequestCompletion,
  checkRateLimits,
  createServiceClient,
  type RequestContext,
} from "../_shared/middleware.ts";

// Get integration API key from hub_integrations_global_config
async function getIntegrationApiKey(supabase: any, integrationKey: string): Promise<string | null> {
  const { data, error } = await supabase
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
  "cultura": "Guardião da Cultura",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  let agentId: string | null = null;
  let agentName: string = "unknown";
  let reqUserId: string | null = null;
  let reqBuId: string | null = null;

  try {
    const supabase = createServiceClient();

    // First, try to get ChatGPT/OpenAI key from integrations config (PRIMARY)
    let useOpenAI = false;
    let openAIApiKey: string | null = await getIntegrationApiKey(supabase, "chatgpt");
    
    if (openAIApiKey) {
      useOpenAI = true;
      console.log("Using OpenAI API from integrations config (primary)");
    }
    
    // Fallback to Lovable API key if ChatGPT is not configured
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!openAIApiKey && lovableApiKey) {
      console.log("ChatGPT not configured, using Lovable AI as fallback");
    }

    if (!openAIApiKey && !lovableApiKey) {
      console.error("No AI API key configured (ChatGPT integration or LOVABLE_API_KEY fallback)");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      reqUserId = user?.id || null;
    }

    const body: InvokeVicRequest = await req.json();
    const { agentSlug, buId, actionContext, context: aiContext, userQuestion } = body;
    reqBuId = buId || null;

    console.log(`[${requestId}] Invoke VIC: agent=${agentSlug}, user=${reqUserId}, bu=${buId}`);

    if (!agentSlug || !actionContext) {
      return errorResponse("agentSlug and actionContext are required", 400, { requestId, error: "MISSING_PARAMS" });
    }

    // Check rate limits using middleware helper
    if (buId) {
      const rateLimitError = await checkRateLimits(supabase, reqUserId, buId, {}, requestId);
      if (rateLimitError) return rateLimitError;
    }

    // Get the agent by slug
    let agent: any = null;
    const { data: agentData, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("slug", agentSlug)
      .eq("is_active", true)
      .single();

    if (!agentError && agentData) {
      agent = agentData;
    } else {
      // Try by name as fallback
      const agentNameFromSlug = AGENT_SLUGS[agentSlug];
      if (agentNameFromSlug) {
        const { data: agentByName } = await supabase
          .from("ai_agents")
          .select("*")
          .eq("name", agentNameFromSlug)
          .eq("is_active", true)
          .single();
        
        if (agentByName) {
          agent = agentByName;
        }
      }
    }
      
    if (!agent) {
      console.error("Agent not found:", agentSlug, agentError);
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    agentId = agent.id;
    agentName = agent.name;

    // Check if agent is enabled for this BU
    if (buId) {
      const { data: activation } = await supabase
        .from("bu_agent_activations")
        .select("is_enabled, custom_system_prompt")
        .eq("bu_id", buId)
        .eq("agent_id", agent.id)
        .single();

      if (activation && !activation.is_enabled) {
        return new Response(
          JSON.stringify({ error: "Agent is disabled for this BU", code: "AGENT_DISABLED" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use custom prompt if available
      if (activation?.custom_system_prompt) {
        agent.system_prompt = activation.custom_system_prompt;
      }
    }

    // Get agent documents for knowledge base
    const { data: documents } = await supabase
      .from("ai_agent_documents")
      .select("name, extracted_content")
      .eq("agent_id", agent.id)
      .eq("status", "ready");

    let knowledgeBase = "";
    if (documents && documents.length > 0) {
      knowledgeBase = documents
        .filter((doc: any) => doc.extracted_content)
        .map((doc: any) => `=== ${doc.name} ===\n${doc.extracted_content}`)
        .join("\n\n");
    }

    // Build system prompt with Vic persona + agent prompt + knowledge
    let systemPrompt = VIC_PERSONA_INTRO + agent.system_prompt;
    if (knowledgeBase) {
      systemPrompt += `\n\n=== BASE DE CONHECIMENTO ===\n${knowledgeBase}`;
    }

    // Build context description
    let contextDescription = `Contexto: ${aiContext.type}`;
    if (aiContext.title) contextDescription += `\nTítulo: ${aiContext.title}`;
    if (aiContext.description) contextDescription += `\nDescrição: ${aiContext.description}`;
    if (aiContext.currentValue !== undefined) contextDescription += `\nValor atual: ${aiContext.currentValue}${aiContext.unit || ''}`;
    if (aiContext.targetValue !== undefined) contextDescription += `\nMeta: ${aiContext.targetValue}${aiContext.unit || ''}`;
    if (aiContext.baselineValue !== undefined) contextDescription += `\nBaseline: ${aiContext.baselineValue}${aiContext.unit || ''}`;
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

    console.log(`Invoking agent: ${agentName} (${agentSlug}) for context: ${actionContext}`);

    // Choose API endpoint and format based on available key
    const apiUrl = useOpenAI 
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    
    const apiKey = useOpenAI ? openAIApiKey : lovableApiKey;
    const modelName = useOpenAI 
      ? (agent.model_name?.startsWith("gpt") ? agent.model_name : "gpt-4o-mini")
      : (agent.model_name || "google/gemini-2.5-flash");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: agent.max_tokens || 800,
        temperature: agent.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);

      // Log the error
      await supabase.from("ai_agent_logs").insert({
        agent_id: agentId,
        agent_name: agentName,
        scope: agent.scope,
        bu_id: buId || null,
        user_id: reqUserId,
        integration_key: agent.integration_key,
        action_context: actionContext,
        status: "error",
        error_message: `AI API error: ${response.status}`,
        latency_ms: Date.now() - startTime,
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", code: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted", code: "NO_CREDITS" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    const latencyMs = Date.now() - startTime;

    // Log the successful call
    await supabase.from("ai_agent_logs").insert({
      agent_id: agentId,
      agent_name: agentName,
      scope: agent.scope,
      bu_id: buId || null,
      user_id: reqUserId,
      integration_key: agent.integration_key,
      action_context: actionContext,
      status: "success",
      model_used: modelName,
      input_tokens: data.usage?.prompt_tokens,
      output_tokens: data.usage?.completion_tokens,
      total_tokens: data.usage?.total_tokens,
      latency_ms: latencyMs,
    });

    console.log(`Agent ${agentName} responded successfully in ${latencyMs}ms`);

    return new Response(
      JSON.stringify({
        response: content,
        agentName: agentName,
        agentSlug: agentSlug,
        tokensUsed: data.usage?.total_tokens,
        latencyMs: latencyMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in invoke-vic function:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from("ai_agent_logs").insert({
        agent_id: agentId,
        agent_name: agentName,
        scope: "global",
        integration_key: "lovable-ai",
        action_context: "error",
        status: "error",
        error_message: errorMessage,
        latency_ms: Date.now() - startTime,
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
