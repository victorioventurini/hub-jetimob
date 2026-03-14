/**
 * Edge Function: okr-construction-review
 * 
 * Avalia automaticamente a qualidade de construção de OKRs
 * Usa o agente "validador-metodologico-okrs" configurado no Hub via invoke-vic
 * 
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md §6 Edge Functions Standards
 * 
 * Modos de operação:
 * - `objective` (default): Avaliação individual de OKR de time
 * - `org-objective`: Avaliação de OKR organizacional
 * - `team-analysis`: Análise consolidada de todos OKRs do time
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  corsResponse,
  jsonResponse,
  errorResponse,
  withMiddleware,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";

// =============================================================================
// TYPES
// =============================================================================

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
  buId?: string;
  mode?: 'objective' | 'team-analysis' | 'org-objective';
  isOrgLevel?: boolean;
  objectiveId?: string;
  objectiveTitle?: string;
  objectiveDescription?: string;
  teamName?: string;
  orgObjectiveTitle?: string;
  keyResults?: KeyResult[];
  year?: number;
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
    keyResults?: Array<{
      id: string;
      title: string;
      baseline: number | null;
      target: number | null;
      unit: string | null;
    }>;
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

// =============================================================================
// PARSING HELPERS
// =============================================================================

/**
 * Parse AI text response into structured assessment
 * Extracts JSON from markdown code blocks if present
 */
function parseAiResponse(content: string, keyResults: KeyResult[]): AiAssessment {
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
    console.log("[okr-construction-review] JSON parse failed, creating structured response from text");
    return createTextBasedAssessment(content, keyResults);
  }
}

/**
 * Create assessment from text response when JSON is not available
 */
function createTextBasedAssessment(text: string, keyResults: KeyResult[]): AiAssessment {
  const scoreMatch = text.match(/(?:score|nota|pontuação)[:\s]*(\d+)/i) || text.match(/(\d+)\s*\/\s*100/);
  const overallScore = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 65;

  const strengths: string[] = [];
  const strengthPatterns = text.match(/(?:\+|ponto\s+forte|destaque)[:\s]*([^\n]+)/gi);
  if (strengthPatterns) {
    strengths.push(...strengthPatterns.slice(0, 3).map(s => s.replace(/^(?:\+|ponto\s+forte|destaque)[:\s]*/i, '').trim()));
  }

  const improvements: string[] = [];
  const improvementPatterns = text.match(/(?:\-|melhoria|sugestão|melhorar)[:\s]*([^\n]+)/gi);
  if (improvementPatterns) {
    improvements.push(...improvementPatterns.slice(0, 3).map(s => s.replace(/^(?:\-|melhoria|sugestão|melhorar)[:\s]*/i, '').trim()));
  }

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

// =============================================================================
// VIC INTEGRATION
// =============================================================================

/**
 * Call invoke-vic edge function with standard error handling
 */
async function callInvokeVic(
  supabaseUrl: string,
  authHeader: string,
  buId: string,
  correlationId: string,
  payload: {
    agentSlug: string;
    actionContext: string;
    context: Record<string, unknown>;
    userQuestion: string;
  }
): Promise<{ content: string | null; error: Response | null }> {
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
      ...payload,
      stream: false,
    }),
  });

  if (!vicResponse.ok) {
    const errorText = await vicResponse.text();
    console.error("[okr-construction-review] invoke-vic error:", vicResponse.status, errorText);
    
    const errorMap: Record<number, string> = {
      429: "Limite de requisições excedido. Tente novamente em alguns minutos.",
      402: "Créditos de IA esgotados.",
      404: "Agente validador-metodologico-okrs não encontrado. Configure o agente em Integrações.",
      403: "Agente validador-metodologico-okrs não está ativado para esta BU.",
    };
    
    const errorMessage = errorMap[vicResponse.status];
    if (errorMessage) {
      return {
        content: null,
        error: new Response(
          JSON.stringify({ error: errorMessage }),
          { status: vicResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        ),
      };
    }
    
    throw new Error(`invoke-vic error: ${vicResponse.status}`);
  }

  const vicData = await vicResponse.json();
  const content = vicData.data?.response || vicData.response || vicData.content || vicData.message;

  if (!content) {
    console.error("[okr-construction-review] Empty response from agent:", JSON.stringify(vicData));
    throw new Error("Resposta vazia do agente");
  }

  return { content, error: null };
}

// =============================================================================
// MODE HANDLERS
// =============================================================================

/**
 * Handle team-analysis mode: consolidated analysis of all team OKRs
 */
async function handleTeamAnalysis(
  body: RequestBody,
  authHeader: string,
  buId: string,
  correlationId: string
): Promise<Response> {
  const { teamId, teamName, objectives, orgObjectives, otherTeamsObjectives } = body;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  if (!objectives?.length) {
    return errorResponse("Objectives required for team-analysis mode", 400, {
      requestId: correlationId,
      error: "MISSING_OBJECTIVES",
    });
  }

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

  const orgObjectivesList = (orgObjectives || []).map((org, i) => {
    const orgKrList = (org.keyResults || []).map((kr, j) => 
      `  - KR${j + 1}: "${kr.title}" | Baseline: ${kr.baseline ?? 'N/A'} → Target: ${kr.target ?? 'N/A'} ${kr.unit || ''}`
    ).join('\n');
    return `${i + 1}. **"${org.title}"**${org.description ? ` - ${org.description}` : ''}
${orgKrList || '  (sem Key Results definidos)'}`;
  }).join('\n\n') || 'Nenhum OKR organizacional definido';

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

  const { content, error } = await callInvokeVic(supabaseUrl, authHeader, buId, correlationId, {
    agentSlug: "validador-metodologico-okrs",
    actionContext: "okr_team_analysis",
    context: contextData,
    userQuestion,
  });

  if (error) return error;

  const teamAnalysis = parseTeamAnalysisResponse(content!);
  console.log("[okr-construction-review] Team analysis generated, score:", teamAnalysis.consolidatedScore);

  return jsonResponse({ teamAnalysis });
}

/**
 * Handle org-objective mode: organizational objective assessment
 */
async function handleOrgObjective(
  body: RequestBody,
  authHeader: string,
  buId: string,
  correlationId: string
): Promise<Response> {
  const { objectiveId, objectiveTitle, objectiveDescription, keyResults: orgKrs, year } = body;
  const krs = orgKrs || [];
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  console.log("[okr-construction-review] Processing org objective:", objectiveTitle);

  const krList = krs.map((kr, i) =>
    `${i + 1}. "${kr.title}" | Tipo: ${kr.type || 'N/A'} | Baseline: ${kr.baseline ?? 'N/A'} | Target: ${kr.target ?? 'N/A'} ${kr.unit || ''} | Responsável: ${kr.owner_user_id ? 'Definido' : 'Não definido'}`
  ).join('\n');

  const contextData = {
    type: "okr_org_construction_review",
    objective: {
      id: objectiveId,
      title: objectiveTitle,
      description: objectiveDescription,
    },
    level: "organizational",
    year,
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

  const userQuestion = `Avalie a qualidade de CONSTRUÇÃO deste **OBJETIVO ORGANIZACIONAL** (nível empresa/C-Level) e responda OBRIGATORIAMENTE em JSON:

**OBJETIVO ORGANIZACIONAL:** ${objectiveTitle}
${objectiveDescription ? `**DESCRIÇÃO:** ${objectiveDescription}` : ''}
**ANO:** ${year || 'Não especificado'}

**KEY RESULTS ORGANIZACIONAIS (${krs.length}):**
${krList || 'CRÍTICO: Nenhum KR definido!'}

---

⚠️ CONTEXTO IMPORTANTE: Este é um OBJETIVO ORGANIZACIONAL, não de time.

CRITÉRIOS ESPECIAIS para OKRs Organizacionais:
- **Clareza**: Deve INSPIRAR e ser compreensível por TODA a organização
- **Ambição**: Deve representar um SALTO ESTRATÉGICO de 12+ meses, não melhorias incrementais
- **Mensurabilidade**: KRs devem ter MÉTRICAS DE ALTO NÍVEL (market share, receita, NPS, etc.)
- **Responsabilidade**: Cada KR deve ter um SPONSOR C-Level ou equivalente
- **Cascading**: Deve ser possível DERIVAR OKRs de times a partir deste objetivo

---

Responda com JSON válido no formato EXATO abaixo (sem texto adicional, APENAS JSON):
{
  "overallScore": number (0-100),
  "summary": "Resumo executivo em 2-3 frases focando no impacto estratégico",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["sugestão 1", "sugestão 2"],
  "alignmentSuggestion": "Sugestão de como os times podem derivar seus OKRs a partir deste",
  "criteriaScores": {
    "clarity": { "score": number, "feedback": "texto focando em clareza inspiracional para toda a org" },
    "measurability": { "score": number, "feedback": "texto focando em métricas de alto nível" },
    "ambition": { "score": number, "feedback": "texto focando em salto estratégico de longo prazo" },
    "alignment": { "score": number, "feedback": "texto focando em potencial de cascading para times" },
    "ownership": { "score": number, "feedback": "texto focando em responsabilidade C-Level" }
  },
  "krFeedback": [
    { "krId": "${krs[0]?.id || 'id'}", "krTitle": "título", "score": number, "strengths": [], "improvements": [], "isTask": boolean }
  ]
}`;

  const { content, error } = await callInvokeVic(supabaseUrl, authHeader, buId, correlationId, {
    agentSlug: "validador-metodologico-okrs",
    actionContext: "okr_org_construction_review",
    context: contextData,
    userQuestion,
  });

  if (error) return error;

  const assessment = parseAiResponse(content!, krs);
  console.log("[okr-construction-review] Org assessment generated, score:", assessment.overallScore);

  return jsonResponse({ assessment });
}

/**
 * Handle objective mode (default): team objective assessment
 */
async function handleObjective(
  body: RequestBody,
  authHeader: string,
  buId: string,
  correlationId: string
): Promise<Response> {
  const { objectiveId, objectiveTitle, objectiveDescription, teamName, orgObjectiveTitle, keyResults } = body;
  const krs = keyResults || [];
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  console.log("[okr-construction-review] Processing team objective:", objectiveTitle);

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

  const { content, error } = await callInvokeVic(supabaseUrl, authHeader, buId, correlationId, {
    agentSlug: "validador-metodologico-okrs",
    actionContext: "okr_construction_review",
    context: contextData,
    userQuestion,
  });

  if (error) return error;

  const assessment = parseAiResponse(content!, krs);
  console.log("[okr-construction-review] Assessment generated, score:", assessment.overallScore);

  return jsonResponse({ assessment });
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Use centralized middleware for auth and CORS
  const result = await withMiddleware(req, {
    requireAuth: true,
    requireBu: false, // BU can come from header or body
    logRequest: true,
  });

  // Handle CORS preflight or auth errors
  if (!result.success) {
    return result.error!;
  }

  const ctx = result.context!;
  const correlationId = ctx.requestId;

  try {
    // Parse body
    const body: RequestBody = await req.json();
    
    // Get BU ID from header or body (fallback for compatibility)
    const buIdFromHeader = req.headers.get("x-current-bu-id");
    const buId = buIdFromHeader || body.buId;

    if (!buId) {
      logRequestCompletion(ctx, "error", "Missing BU ID");
      return errorResponse("BU ID required (x-current-bu-id header or buId in body)", 400, {
        requestId: correlationId,
        error: "MISSING_BU_ID",
      });
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";

    console.log(`[${correlationId}] Mode: ${body.mode || 'objective'}, BU: ${buId}`);

    // Route to appropriate handler based on mode
    if (body.mode === 'team-analysis') {
      const response = await handleTeamAnalysis(body, authHeader, buId, correlationId);
      logRequestCompletion(ctx, "success", "team-analysis");
      return response;
    }

    const isOrgLevel = body.mode === 'org-objective' || body.isOrgLevel === true;
    if (isOrgLevel) {
      const response = await handleOrgObjective(body, authHeader, buId, correlationId);
      logRequestCompletion(ctx, "success", "org-objective");
      return response;
    }

    const response = await handleObjective(body, authHeader, buId, correlationId);
    logRequestCompletion(ctx, "success", "objective");
    return response;

  } catch (error) {
    console.error(`[${correlationId}] Error:`, error);
    logRequestCompletion(ctx, "error", error instanceof Error ? error.message : "Unknown error");
    return errorResponse(
      error instanceof Error ? error.message : "Erro ao processar avaliação",
      500,
      { requestId: correlationId, error: "INTERNAL_ERROR" }
    );
  }
});
