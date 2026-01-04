import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const startTime = Date.now();
  let agentId: string | null = null;
  let agentName: string = "unknown";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: InvokeVicRequest = await req.json();
    const { agentSlug, buId, actionContext, context, userQuestion } = body;

    if (!agentSlug || !actionContext) {
      return new Response(
        JSON.stringify({ error: "agentSlug and actionContext are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if IA is enabled for this BU
    if (buId) {
      const { data: iaConfig } = await supabase
        .from("bu_ia_config")
        .select("ia_enabled, max_calls_per_user_day, max_calls_per_bu_day")
        .eq("bu_id", buId)
        .single();

      if (iaConfig && !iaConfig.ia_enabled) {
        return new Response(
          JSON.stringify({ error: "IA is disabled for this BU", code: "IA_DISABLED" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check rate limits
      if (iaConfig?.max_calls_per_user_day && userId) {
        const { data: userCalls } = await supabase.rpc("count_user_calls_today", {
          p_user_id: userId,
          p_bu_id: buId,
        });
        
        if (userCalls >= iaConfig.max_calls_per_user_day) {
          return new Response(
            JSON.stringify({ 
              error: "Daily user limit reached", 
              code: "USER_LIMIT_REACHED",
              limit: iaConfig.max_calls_per_user_day 
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (iaConfig?.max_calls_per_bu_day) {
        const { data: buCalls } = await supabase.rpc("count_bu_calls_today", {
          p_bu_id: buId,
        });
        
        if (buCalls >= iaConfig.max_calls_per_bu_day) {
          return new Response(
            JSON.stringify({ 
              error: "Daily BU limit reached", 
              code: "BU_LIMIT_REACHED",
              limit: iaConfig.max_calls_per_bu_day 
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Get the agent by slug
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("slug", agentSlug)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
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
          Object.assign(agent || {}, agentByName);
        }
      }
      
      if (!agent) {
        console.error("Agent not found:", agentSlug, agentError);
        return new Response(
          JSON.stringify({ error: "Agent not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
        .filter((doc) => doc.extracted_content)
        .map((doc) => `=== ${doc.name} ===\n${doc.extracted_content}`)
        .join("\n\n");
    }

    // Build system prompt with Vic persona + agent prompt + knowledge
    let systemPrompt = VIC_PERSONA_INTRO + agent.system_prompt;
    if (knowledgeBase) {
      systemPrompt += `\n\n=== BASE DE CONHECIMENTO ===\n${knowledgeBase}`;
    }

    // Build context description
    let contextDescription = `Contexto: ${context.type}`;
    if (context.title) contextDescription += `\nTítulo: ${context.title}`;
    if (context.description) contextDescription += `\nDescrição: ${context.description}`;
    if (context.currentValue !== undefined) contextDescription += `\nValor atual: ${context.currentValue}${context.unit || ''}`;
    if (context.targetValue !== undefined) contextDescription += `\nMeta: ${context.targetValue}${context.unit || ''}`;
    if (context.baselineValue !== undefined) contextDescription += `\nBaseline: ${context.baselineValue}${context.unit || ''}`;
    if (context.status) contextDescription += `\nStatus: ${context.status}`;
    if (context.additionalData) {
      contextDescription += `\nDados adicionais: ${JSON.stringify(context.additionalData, null, 2)}`;
    }

    // Build user prompt
    let userPrompt = contextDescription;
    if (userQuestion) {
      userPrompt += `\n\nPergunta do usuário: ${userQuestion}`;
    } else {
      userPrompt += `\n\nAnalise o contexto acima e forneça suas recomendações.`;
    }

    console.log(`Invoking agent: ${agentName} (${agentSlug}) for context: ${actionContext}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent.model_name || "google/gemini-2.5-flash",
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
      console.error("AI Gateway error:", response.status, errorText);

      // Log the error
      await supabase.from("ai_agent_logs").insert({
        agent_id: agentId,
        agent_name: agentName,
        scope: agent.scope,
        bu_id: buId || null,
        user_id: userId,
        integration_key: agent.integration_key,
        action_context: actionContext,
        status: "error",
        error_message: `AI Gateway error: ${response.status}`,
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

      throw new Error(`AI Gateway error: ${response.status}`);
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
      user_id: userId,
      integration_key: agent.integration_key,
      action_context: actionContext,
      status: "success",
      model_used: agent.model_name || "google/gemini-2.5-flash",
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
