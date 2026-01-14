/**
 * Edge Function: okr-construction-review
 * 
 * Avalia automaticamente a qualidade de construção de OKRs usando IA
 * Retorna sugestões detalhadas por KR, objetivo e alinhamento global
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KeyResult {
  id: string;
  title: string;
  type: string | null;
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

interface KrFeedback {
  krId: string;
  krTitle: string;
  score: number;
  strengths: string[];
  improvements: string[];
  isTask: boolean; // Se parece mais com task do que KR
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
  alignmentSuggestion: string; // Sugestão de alinhamento com OKRs organizacionais
  criteriaScores: {
    clarity: CriteriaScore;
    measurability: CriteriaScore;
    ambition: CriteriaScore;
    alignment: CriteriaScore;
    ownership: CriteriaScore;
  };
  krFeedback: KrFeedback[];
  generatedAt: string;
}

serve(async (req) => {
  console.log("[okr-construction-review] Request received:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { objectiveId, objectiveTitle, objectiveDescription, teamName, orgObjectiveTitle, keyResults } = body;

    console.log("[okr-construction-review] Processing objective:", objectiveTitle);
    console.log("[okr-construction-review] Key Results count:", keyResults?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[okr-construction-review] LOVABLE_API_KEY not found");
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Build prompt
    const krList = (keyResults || []).map((kr, i) => 
      `${i + 1}. ID: "${kr.id}" | Título: "${kr.title}" | Tipo: ${kr.type || 'N/A'} | Baseline: ${kr.baseline ?? 'N/A'} | Target: ${kr.target ?? 'N/A'} ${kr.unit || ''} | Dono: ${kr.owner_user_id ? 'Definido' : 'Não definido'}`
    ).join('\n');

    const systemPrompt = `Você é um especialista em OKRs (Objectives and Key Results) com profundo conhecimento da metodologia. Sua tarefa é avaliar a qualidade de CONSTRUÇÃO de OKRs e fornecer feedback ACIONÁVEL.

## CRITÉRIOS DE AVALIAÇÃO (0-100 cada):

1. **Clareza (clarity)**: Linguagem clara, sem ambiguidades, qualquer pessoa entende
2. **Mensurabilidade (measurability)**: KRs têm baseline, target e unidade definidos
3. **Ambição vs Realismo (ambition)**: Metas stretch (70% = sucesso) mas alcançáveis
4. **Alinhamento (alignment)**: Conectado com objetivo organizacional, faz sentido estratégico
5. **Responsabilidade (ownership)**: Cada KR tem um dono definido

## ANÁLISE DE KEY RESULTS:
Para cada KR, identifique:
- Se parece TASK (atividade) ao invés de KEY RESULT (resultado mensurável)
- Pontos fortes específicos
- Sugestões de melhoria concretas e acionáveis

## ALINHAMENTO ESTRATÉGICO:
Sugira como melhorar o alinhamento com o objetivo organizacional (se houver) ou como conectar melhor com a estratégia.

## REGRAS:
- Seja específico e construtivo
- Dê exemplos concretos de como melhorar
- Score 80+ = aprovado, 50-79 = precisa melhorar, <50 = revisar urgente
- Identifique KRs que são na verdade tasks (atividades sem resultado mensurável)

Responda APENAS com JSON válido no formato especificado.`;

    const userPrompt = `Avalie este OKR:

**OBJETIVO:** ${objectiveTitle}
${objectiveDescription ? `**DESCRIÇÃO:** ${objectiveDescription}` : ''}
**TIME:** ${teamName || 'Não especificado'}
**OBJETIVO ORGANIZACIONAL:** ${orgObjectiveTitle || 'Não vinculado (problema de alinhamento!)'}

**KEY RESULTS (${keyResults.length}):**
${krList || 'CRÍTICO: Nenhum KR definido!'}

---

Responda com JSON no formato:
{
  "overallScore": number (0-100),
  "summary": "Resumo executivo em 2-3 frases avaliando a OKR como um todo",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["sugestão geral 1", "sugestão geral 2"],
  "alignmentSuggestion": "Sugestão específica de como melhorar o alinhamento com ${orgObjectiveTitle || 'objetivos organizacionais'}",
  "criteriaScores": {
    "clarity": { "score": number, "feedback": "feedback específico" },
    "measurability": { "score": number, "feedback": "feedback específico" },
    "ambition": { "score": number, "feedback": "feedback específico" },
    "alignment": { "score": number, "feedback": "feedback específico" },
    "ownership": { "score": number, "feedback": "feedback específico" }
  },
  "krFeedback": [
    {
      "krId": "id do KR",
      "krTitle": "título do KR",
      "score": number (0-100),
      "strengths": ["ponto forte"],
      "improvements": ["sugestão de melhoria com exemplo concreto"],
      "isTask": boolean (true se parecer mais task do que resultado)
    }
  ]
}`;

    console.log("[okr-construction-review] Calling AI gateway...");
    
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
        temperature: 0.2,
      }),
    });

    console.log("[okr-construction-review] AI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[okr-construction-review] AI gateway error:", response.status, errorText);
      
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
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("[okr-construction-review] AI content received, length:", content?.length || 0);

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

    let assessment: AiAssessment;
    try {
      assessment = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[okr-construction-review] JSON parse error:", parseError);
      console.error("[okr-construction-review] Raw content:", content.substring(0, 500));
      throw new Error("Erro ao processar resposta da IA");
    }
    
    assessment.generatedAt = new Date().toISOString();

    console.log("[okr-construction-review] Assessment generated, score:", assessment.overallScore);

    return new Response(
      JSON.stringify({ assessment }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[okr-construction-review] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao processar avaliação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
