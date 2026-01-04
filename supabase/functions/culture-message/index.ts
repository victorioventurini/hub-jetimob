import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_NAME = "Guardião da Cultura";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the Guardião da Cultura agent
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("name", AGENT_NAME)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      console.error("Agent not found:", agentError);
      return new Response(
        JSON.stringify({ error: "Culture agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get agent documents (knowledge base)
    const { data: documents } = await supabase
      .from("ai_agent_documents")
      .select("name, extracted_content")
      .eq("agent_id", agent.id)
      .eq("status", "ready");

    // Build knowledge base context
    let knowledgeBase = "";
    if (documents && documents.length > 0) {
      knowledgeBase = documents
        .filter(doc => doc.extracted_content)
        .map(doc => `=== ${doc.name} ===\n${doc.extracted_content}`)
        .join("\n\n");
    }

    // Get current date for context
    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR", { 
      weekday: "long", 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    });

    // Build the prompt for generating a culture message
    const userPrompt = `
Hoje é ${dateStr}.

Gere UMA mensagem de cultura para exibir na Home do Hub da Jetimob.

REGRAS:
- Máximo 180 caracteres
- Linguagem humana e direta
- Ligada a um valor ou ao propósito
- Incentive ação ou reflexão prática
- Não use emojis em excesso (máximo 1 se necessário)
- Não soe como mensagem automática de sistema
- Não repita textos literais do manual
- Pode usar expressões como "buenas" em contextos leves

FORMATO DE RESPOSTA:
Retorne APENAS a mensagem, sem aspas, sem explicações adicionais.
`;

    const systemPrompt = `${agent.system_prompt}

${knowledgeBase ? `\n\n=== BASE DE CONHECIMENTO ===\n${knowledgeBase}` : ""}`;

    console.log("Calling Lovable AI for culture message...");

    // Call Lovable AI Gateway
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
          { role: "user", content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to generate culture message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() || "";

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Culture message generated:", message.substring(0, 50) + "...");

    // Log the execution
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
    });

    return new Response(
      JSON.stringify({ 
        message,
        generatedAt: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating culture message:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
