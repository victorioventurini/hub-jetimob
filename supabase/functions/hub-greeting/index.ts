import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_NAME = "Persona do Vic | Agente de saudações do Hub";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Manual auth check (we keep verify_jwt disabled to avoid platform-level auth mismatches)
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: authError } = await authClient.auth.getUser();
    const user = userData?.user;

    if (authError || !user) {
      console.warn("Unauthorized request to hub-greeting:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      userName,
      userGender,
      periodOfDay,
      dayOfWeek,
      buName,
      okrSummary,
      kpiSummary,
      recentGreetings,
    } = body;

    // Get the greeting agent
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("name", AGENT_NAME)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      console.error("Agent not found:", agentError);
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Build context for the agent
    const contextData = {
      user: {
        first_name: userName || null,
        gender: userGender || null,
      },
      time_context: {
        period_of_day: periodOfDay,
        day_of_week: dayOfWeek,
      },
      bu_context: {
        bu_name: buName || null,
      },
      status_summary: {
        okrs: okrSummary || null,
        kpis: kpiSummary || null,
      },
    };

    // Build repetition avoidance block
    const repetitionBlock = recentGreetings?.length
      ? `\n\nEVITE REPETIR qualquer uma destas saudações recentes:\n- ${recentGreetings.slice(0, 10).join("\n- ")}`
      : "";

    // Build system prompt with knowledge base
    const systemPrompt = knowledgeBase
      ? `${agent.system_prompt}\n\n=== BASE DE CONHECIMENTO ===\n${knowledgeBase}`
      : agent.system_prompt;

    // Build user prompt
    const userPrompt = `Gere uma saudação para o Hub com base neste contexto:

${JSON.stringify(contextData, null, 2)}

Retorne APENAS um JSON válido no formato:
{
  "greeting": "linha principal da saudação",
  "subtext": "frase de apoio"
}

Regras:
- greeting: máximo 60 caracteres
- subtext: máximo 80 caracteres
- Usar emoji com moderação (máximo 1 no greeting)
- Tom humano, direto, leve
- Evitar gênero quando possível
${repetitionBlock}`;

    console.log("Calling AI Gateway for greeting generation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted" }),
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

    // Parse the JSON response
    let greetingData;
    try {
      // Clean potential markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      greetingData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    const latencyMs = Date.now() - startTime;

    // Log the successful call
    await supabase.from("ai_agent_logs").insert({
      agent_id: agent.id,
      agent_name: agent.name,
      scope: agent.scope,
      integration_key: agent.integration_key,
      status: "success",
      model_used: "google/gemini-2.5-flash",
      input_tokens: data.usage?.prompt_tokens,
      output_tokens: data.usage?.completion_tokens,
      total_tokens: data.usage?.total_tokens,
      latency_ms: latencyMs,
      user_id: user.id,
    });

    console.log("Greeting generated successfully:", greetingData);

    return new Response(
      JSON.stringify({
        greeting: greetingData.greeting,
        subtext: greetingData.subtext,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in hub-greeting function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
