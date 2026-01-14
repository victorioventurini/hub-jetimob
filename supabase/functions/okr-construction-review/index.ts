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
  mode?: 'objective' | 'team-analysis';
  // Modo objective (padrão)
  objectiveId?: string;
  objectiveTitle?: string;
  objectiveDescription?: string;
  teamName?: string;
  orgObjectiveTitle?: string;
  keyResults?: KeyResult[];
  // Modo team-analysis
  teamId?: string;
  cycleId?: string;
  objectives?: Array<{
    id: string;
    title: string;
    description?: string;
    orgObjectiveId?: string;
    orgObjectiveTitle?: string;
    keyResults: Array<{
      id: string;
      title: string;
      type: string | null;
      baseline: number | null;
      target: number | null;
      unit: string | null;
      hasOwner: boolean;
    }>;
  }>;
  orgObjectives?: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  otherTeamsObjectives?: Array<{
    teamId: string;
    teamName: string;
    leaderFirstName: string;
    objectives: Array<{
      id: string;
      title: string;
    }>;
  }>;
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

// ============================================================
// TEAM ANALYSIS TYPES
// ============================================================

interface SharedObjectiveSuggestion {
  objectiveId: string;
  objectiveTitle: string;
  suggestedTeamId: string;
  suggestedTeamName: string;
  suggestedLeaderFirstName: string;
  suggestedObjectiveId: string;
  suggestedObjectiveTitle: string;
  reason: string;
}

interface TeamAnalysisResult {
  consolidatedScore: number;
  consolidatedSummary: string;
  orgAlignmentAnalysis: {
    score: number;
    coveredOrgObjectives: string[];
    uncoveredOrgObjectives: string[];
    feedback: string;
  };
  sharedSuggestions: SharedObjectiveSuggestion[];
  generatedAt: string;
}

/**
 * Parse team analysis response into structured format
 */
function parseTeamAnalysisResponse(content: string): TeamAnalysisResult {
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
    // Fallback
    return {
      consolidatedScore: 70,
      consolidatedSummary: content.substring(0, 300),
      orgAlignmentAnalysis: {
        score: 70,
        coveredOrgObjectives: [],
        uncoveredOrgObjectives: [],
        feedback: "Análise textual - verifique alinhamento manualmente",
      },
      sharedSuggestions: [],
      generatedAt: new Date().toISOString(),
    };
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL não configurada");
    }

    // ────────────────────────────────────────────────────────────
    // MODO: TEAM ANALYSIS (análise consolidada do time)
    // ────────────────────────────────────────────────────────────
    if (body.mode === 'team-analysis') {
      console.log("[okr-construction-review] Mode: team-analysis");
      const { teamId, teamName, objectives, orgObjectives, otherTeamsObjectives } = body;

      if (!objectives?.length) {
        return new Response(
          JSON.stringify({ error: "Objectives required for team-analysis mode" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build context for consolidated analysis
      const objectivesList = objectives.map((obj, i) => {
        const krList = (obj.keyResults || []).map((kr, j) => 
          `  ${j + 1}. "${kr.title}" | Tipo: ${kr.type || 'N/A'} | Baseline: ${kr.baseline ?? 'N/A'} | Target: ${kr.target ?? 'N/A'} ${kr.unit || ''} | Dono: ${kr.hasOwner ? 'Definido' : 'NÃO'}`
        ).join('\n');
        return `**${i + 1}. ${obj.title}**
${obj.description ? `   Descrição: ${obj.description}` : ''}
   Vinculado a: ${obj.orgObjectiveTitle || 'NÃO VINCULADO'}
   Key Results (${obj.keyResults.length}):
${krList}`;
      }).join('\n\n');

      const orgObjectivesList = (orgObjectives || []).map((org, i) => 
        `${i + 1}. "${org.title}"`
      ).join('\n') || 'Nenhum OKR organizacional definido';

      const otherTeamsList = (otherTeamsObjectives || []).map(team => 
        `**${team.teamName}** (Líder: ${team.leaderFirstName}):
${team.objectives.map((obj, i) => `  ${i + 1}. "${obj.title}"`).join('\n')}`
      ).join('\n\n') || 'Nenhum outro time com OKRs no ciclo';

      const userQuestion = `Faça uma ANÁLISE CONSOLIDADA dos OKRs deste time e responda OBRIGATORIAMENTE em JSON:

**TIME:** ${teamName || 'Não especificado'}

=== OBJETIVOS DO TIME (${objectives.length}) ===
${objectivesList}

=== OKRs ORGANIZACIONAIS DO CICLO ===
${orgObjectivesList}

=== OBJETIVOS DE OUTROS TIMES (para identificar sinergias) ===
${otherTeamsList}

---

Analise:
1. Score consolidado de qualidade de construção (0-100)
2. Resumo executivo da qualidade do conjunto de OKRs
3. Alinhamento com OKRs organizacionais (quais estão cobertos, quais não)
4. Sugestões de OBJETIVOS COMPARTILHADOS: identifique sinergias entre os objetivos deste time e de outros times. Para cada sinergia, sugira uma conversa no formato "Troque uma ideia com [nome] do time [time]. O objetivo [objetivo dele] parece ter sinergia com o seu [objetivo do time atual]."

Responda com JSON válido no formato EXATO abaixo:
{
  "consolidatedScore": number (0-100),
  "consolidatedSummary": "Resumo executivo em 3-4 frases sobre a qualidade geral",
  "orgAlignmentAnalysis": {
    "score": number (0-100),
    "coveredOrgObjectives": ["título do objetivo org coberto 1", "título 2"],
    "uncoveredOrgObjectives": ["título do objetivo org NÃO coberto"],
    "feedback": "Análise do alinhamento estratégico"
  },
  "sharedSuggestions": [
    {
      "objectiveId": "id do objetivo deste time",
      "objectiveTitle": "título do objetivo deste time",
      "suggestedTeamId": "id do time sugerido",
      "suggestedTeamName": "nome do time sugerido",
      "suggestedLeaderFirstName": "primeiro nome do líder",
      "suggestedObjectiveId": "id do objetivo do outro time",
      "suggestedObjectiveTitle": "título do objetivo do outro time",
      "reason": "Por que esses objetivos têm sinergia"
    }
  ]
}`;

      const contextData = {
        type: "okr_team_analysis",
        team: { id: teamId, name: teamName },
        objectives: objectives.map(o => ({
          id: o.id,
          title: o.title,
          orgObjectiveTitle: o.orgObjectiveTitle,
          krCount: o.keyResults.length,
        })),
        orgObjectivesCount: orgObjectives?.length || 0,
        otherTeamsCount: otherTeamsObjectives?.length || 0,
      };

      const vicResponse = await fetch(`${supabaseUrl}/functions/v1/invoke-vic`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
          "x-current-bu-id": buId,
          "x-correlation-id": correlationId,
        },
        body: JSON.stringify({
          buId,
          agentSlug: "coach-okrs",
          actionContext: "okr_team_analysis",
          context: contextData,
          userQuestion,
          stream: false,
        }),
      });

      if (!vicResponse.ok) {
        const errorText = await vicResponse.text();
        console.error("[okr-construction-review] team-analysis error:", vicResponse.status, errorText);
        throw new Error(`invoke-vic error: ${vicResponse.status}`);
      }

      const vicData = await vicResponse.json();
      // invoke-vic returns { response: content, agentName, ... }
      const content = vicData.response || vicData.content || vicData.message;

      if (!content) {
        console.error("[okr-construction-review] team-analysis: empty response from agent", JSON.stringify(vicData));
        throw new Error("Resposta vazia do agente");
      }

      const teamAnalysis = parseTeamAnalysisResponse(content);
      console.log("[okr-construction-review] Team analysis generated, score:", teamAnalysis.consolidatedScore);

      return new Response(
        JSON.stringify({ teamAnalysis }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ────────────────────────────────────────────────────────────
    // MODO: OBJECTIVE (avaliação individual - padrão)
    // ────────────────────────────────────────────────────────────
    const { objectiveId, objectiveTitle, objectiveDescription, teamName, orgObjectiveTitle, keyResults } = body;
    const krs = keyResults || [];

    console.log("[okr-construction-review] Mode: objective (default)");
    console.log("[okr-construction-review] Processing objective:", objectiveTitle);
    console.log("[okr-construction-review] Key Results count:", krs.length);

    // Build context for the agent
    const krList = krs.map((kr, i) =>
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
      keyResults: krs.map(kr => ({
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

**KEY RESULTS (${krs.length}):**
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
    { "krId": "${krs[0]?.id || 'id'}", "krTitle": "título", "score": number, "strengths": [], "improvements": [], "isTask": boolean }
  ]
}`;

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
    // invoke-vic returns { response: content, agentName, ... }
    const content = vicData.response || vicData.content || vicData.message;

    console.log("[okr-construction-review] AI content received, length:", content?.length || 0);

    if (!content) {
      console.error("[okr-construction-review] objective: empty response from agent", JSON.stringify(vicData));
      throw new Error("Resposta vazia do agente");
    }

    // Parse the response into structured assessment
    const assessment = parseAiResponse(content, krs);

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
