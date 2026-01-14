/**
 * Edge Function: okr-construction-review
 * 
 * Avalia a qualidade de construção de uma OKR usando IA
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KeyResult {
  id: string;
  title: string;
  type: string;
  baseline: number | null;
  target: number | null;
  unit: string | null;
  owner_user_id: string | null;
}

interface RequestBody {
  objectiveId: string;
  objectiveTitle: string;
  objectiveDescription?: string;
  teamName?: string;
  orgObjectiveTitle?: string;
  keyResults: KeyResult[];
}

interface CriteriaScore {
  score: number;
  feedback: string;
}

interface AiAssessment {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  criteriaScores: {
    clarity: CriteriaScore;
    measurability: CriteriaScore;
    ambition: CriteriaScore;
    alignment: CriteriaScore;
    ownership: CriteriaScore;
  };
  generatedAt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { objectiveTitle, objectiveDescription, teamName, orgObjectiveTitle, keyResults } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Build prompt
    const krList = keyResults.map((kr, i) => 
      `${i + 1}. "${kr.title}" - Tipo: ${kr.type || 'N/A'}, Baseline: ${kr.baseline ?? 'N/A'}, Target: ${kr.target ?? 'N/A'} ${kr.unit || ''}, Dono: ${kr.owner_user_id ? 'Definido' : 'Não definido'}`
    ).join('\n');

    const systemPrompt = `Você é um especialista em OKRs (Objectives and Key Results). Sua tarefa é avaliar a qualidade de CONSTRUÇÃO de OKRs antes do ciclo iniciar.

Avalie nos seguintes critérios (0-100 cada):

1. **Clareza**: O objetivo e KRs são claros, sem ambiguidades?
2. **Mensurabilidade**: KRs têm métricas numéricas claras (baseline, target, unidade)?
3. **Ambição vs Realismo**: Metas são desafiadoras (stretch) mas alcançáveis?
4. **Alinhamento**: Conectado com objetivo organizacional? Faz sentido estratégico?
5. **Responsabilidade**: Cada KR tem um dono definido?

IMPORTANTE:
- Seja construtivo e específico nas sugestões
- Identifique pontos fortes para reforçar
- Sugira melhorias práticas e acionáveis
- Score 70+ = bom, 50-69 = precisa melhorar, <50 = revisar

Responda APENAS com JSON válido no formato especificado.`;

    const userPrompt = `Avalie este OKR:

**Objetivo:** ${objectiveTitle}
${objectiveDescription ? `**Descrição:** ${objectiveDescription}` : ''}
**Time:** ${teamName || 'Não especificado'}
**Objetivo Organizacional:** ${orgObjectiveTitle || 'Não vinculado'}

**Key Results (${keyResults.length}):**
${krList || 'Nenhum KR definido'}

Responda com JSON:
{
  "overallScore": number (0-100),
  "summary": "Resumo em 1-2 frases",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["sugestão 1", "sugestão 2", "sugestão 3"],
  "criteriaScores": {
    "clarity": { "score": number, "feedback": "string" },
    "measurability": { "score": number, "feedback": "string" },
    "ambition": { "score": number, "feedback": "string" },
    "alignment": { "score": number, "feedback": "string" },
    "ownership": { "score": number, "feedback": "string" }
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim();
    }

    const assessment: AiAssessment = JSON.parse(jsonStr);
    assessment.generatedAt = new Date().toISOString();

    return new Response(
      JSON.stringify({ assessment }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in okr-construction-review:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao processar avaliação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
