/**
 * Edge Function: okr-construction-review
 * 
 * Avalia automaticamente a qualidade de construção de OKRs
 * Usa o agente "coach-okrs" configurado no Hub via invoke-vic
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-current-bu-id",
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
  isTask: boolean;
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
  alignmentSuggestion: string;
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

/**
 * Parse AI text response into structured assessment
 * Extracts JSON from markdown code blocks if present
 */
function parseAiResponse(content: string, keyResults: KeyResult[]): AiAssessment {
  // Try to extract JSON from markdown code blocks
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    // If JSON parsing fails, create structured assessment from text
    console.log("[okr-construction-review] JSON parse failed, creating structured response from text");
    return createTextBasedAssessment(content, keyResults);
  }
}

/**
 * Create assessment from text response when JSON is not available
 */
function createTextBasedAssessment(text: string, keyResults: KeyResult[]): AiAssessment {
  // Extract score if mentioned (e.g., "Score: 75" or "75/100")
  const scoreMatch = text.match(/(?:score|nota|pontuação)[:\s]*(\d+)/i) || text.match(/(\d+)\s*\/\s*100/);
  const overallScore = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 65;

  // Extract strengths (look for + or "ponto forte" patterns)
  const strengths: string[] = [];
  const strengthPatterns = text.match(/(?:\+|ponto\s+forte|destaque)[:\s]*([^\n]+)/gi);
  if (strengthPatterns) {
    strengths.push(...strengthPatterns.slice(0, 3).map(s => s.replace(/^(?:\+|ponto\s+forte|destaque)[:\s]*/i, '').trim()));
  }

  // Extract improvements (look for - or "melhoria" patterns)
  const improvements: string[] = [];
  const improvementPatterns = text.match(/(?:\-|melhoria|sugestão|melhorar)[:\s]*([^\n]+)/gi);
  if (improvementPatterns) {
    improvements.push(...improvementPatterns.slice(0, 3).map(s => s.replace(/^(?:\-|melhoria|sugestão|melhorar)[:\s]*/i, '').trim()));
  }

  // Create KR feedback
  const krFeedback: KrFeedback[] = keyResults.map(kr => {
    const isTask = kr.baseline === null && kr.target === null;
    return {
      krId: kr.id,
      krTitle: kr.title,
      score: isTask ? 40 : (kr.owner_user_id ? 70 : 55),
      strengths: [],
      improvements: isTask 
        ? ["Este KR parece uma tarefa. Transforme em resultado mensurável."]
        : (kr.owner_user_id ? [] : ["Definir responsável para este KR"]),
      isTask,
    };
  });

  return {
    overallScore,
    summary: text.substring(0, 300) + (text.length > 300 ? '...' : ''),
    strengths: strengths.length > 0 ? strengths : ["Objetivo definido"],
    improvements: improvements.length > 0 ? improvements : ["Revisar métricas dos KRs"],
    alignmentSuggestion: "Verifique se os KRs contribuem diretamente para o objetivo organizacional.",
    criteriaScores: {
      clarity: { score: 70, feedback: "Avaliação baseada em análise textual" },
      measurability: { score: 60, feedback: "Alguns KRs podem precisar de métricas mais claras" },
      ambition: { score: 65, feedback: "Considere se as metas são desafiadoras mas alcançáveis" },
      alignment: { score: 65, feedback: "Verifique conexão com objetivos organizacionais" },
      ownership: { score: keyResults.every(kr => kr.owner_user_id) ? 85 : 50, feedback: keyResults.every(kr => kr.owner_user_id) ? "Todos KRs têm responsável" : "Alguns KRs sem responsável definido" },
    },
    krFeedback,
    generatedAt: new Date().toISOString(),
  };
}

serve(async (req) => {
  console.log("[okr-construction-review] Request received:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Forward auth headers
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const buId = req.headers.get("x-current-bu-id");
    const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!buId) {
      return new Response(
        JSON.stringify({ error: "BU ID required (x-current-bu-id header)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { objectiveId, objectiveTitle, objectiveDescription, teamName, orgObjectiveTitle, keyResults } = body;

    console.log("[okr-construction-review] Processing objective:", objectiveTitle);
    console.log("[okr-construction-review] Key Results count:", keyResults?.length || 0);
    console.log("[okr-construction-review] Using agent: coach-okrs");

    // Build context for the agent
    const krList = (keyResults || []).map((kr, i) =>
      `${i + 1}. "${kr.title}" | Tipo: ${kr.type || 'N/A'} | Baseline: ${kr.baseline ?? 'N/A'} | Target: ${kr.target ?? 'N/A'} ${kr.unit || ''} | Dono: ${kr.owner_user_id ? 'Definido' : 'Não definido'}`
    ).join('\n');

    const contextData = {
      type: "okr_construction_review",
      objective: {
        id: objectiveId,
        title: objectiveTitle,
        description: objectiveDescription,
      },
      team: teamName,
      orgObjective: orgObjectiveTitle,
      keyResults: keyResults.map(kr => ({
        id: kr.id,
        title: kr.title,
        type: kr.type,
        baseline: kr.baseline,
        target: kr.target,
        unit: kr.unit,
        hasOwner: !!kr.owner_user_id,
      })),
    };

    const userQuestion = `Avalie a qualidade de CONSTRUÇÃO deste OKR e responda OBRIGATORIAMENTE em JSON:

**OBJETIVO:** ${objectiveTitle}
${objectiveDescription ? `**DESCRIÇÃO:** ${objectiveDescription}` : ''}
**TIME:** ${teamName || 'Não especificado'}
**OBJETIVO ORGANIZACIONAL:** ${orgObjectiveTitle || 'Não vinculado (problema de alinhamento!)'}

**KEY RESULTS (${keyResults.length}):**
${krList || 'CRÍTICO: Nenhum KR definido!'}

---

Responda com JSON válido no formato EXATO abaixo (sem texto adicional, APENAS JSON):
{
  "overallScore": number (0-100),
  "summary": "Resumo executivo em 2-3 frases",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["sugestão 1", "sugestão 2"],
  "alignmentSuggestion": "Sugestão de alinhamento estratégico",
  "criteriaScores": {
    "clarity": { "score": number, "feedback": "texto" },
    "measurability": { "score": number, "feedback": "texto" },
    "ambition": { "score": number, "feedback": "texto" },
    "alignment": { "score": number, "feedback": "texto" },
    "ownership": { "score": number, "feedback": "texto" }
  },
  "krFeedback": [
    { "krId": "${keyResults[0]?.id || 'id'}", "krTitle": "título", "score": number, "strengths": [], "improvements": [], "isTask": boolean }
  ]
}`;

    // Get Supabase URL from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL não configurada");
    }

    // Call invoke-vic with coach-okrs agent
    console.log("[okr-construction-review] Calling invoke-vic...");

    const vicResponse = await fetch(`${supabaseUrl}/functions/v1/invoke-vic`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        "x-current-bu-id": buId,
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({
        // IMPORTANT: invoke-vic middleware reads BU from body (bu_id/buId)
        buId,
        agentSlug: "coach-okrs",
        actionContext: "okr_construction_review",
        context: contextData,
        userQuestion,
        stream: false,
      }),
    });

    console.log("[okr-construction-review] invoke-vic response status:", vicResponse.status);

    if (!vicResponse.ok) {
      const errorText = await vicResponse.text();
      console.error("[okr-construction-review] invoke-vic error:", vicResponse.status, errorText);
      
      // Forward specific error codes
      if (vicResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (vicResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (vicResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: "Agente coach-okrs não encontrado. Configure o agente em Integrações." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (vicResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: "Agente coach-okrs não está ativado para esta BU." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`invoke-vic error: ${vicResponse.status}`);
    }

    const vicData = await vicResponse.json();
    const content = vicData.content || vicData.message;

    console.log("[okr-construction-review] AI content received, length:", content?.length || 0);

    if (!content) {
      throw new Error("Resposta vazia do agente");
    }

    // Parse the response into structured assessment
    const assessment = parseAiResponse(content, keyResults);

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
