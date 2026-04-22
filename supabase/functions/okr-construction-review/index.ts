/**
 * Edge Function: okr-construction-review
 *
 * Avalia automaticamente a qualidade de construção de OKRs.
 * Usa o agente "validador-metodologico-okrs" via invoke-vic.
 *
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md §6 Edge Functions Standards
 *
 * Modos de operação:
 * - `objective` (default): Avaliação individual de OKR de time
 * - `org-objective`: Avaliação de OKR organizacional
 * - `team-analysis`: Análise consolidada de todos OKRs do time
 *
 * Estrutura modular (Wave 2 do Refator Sistêmico — 2026-04-22):
 * - `types.ts`     → contratos de payload/resultado
 * - `parsers.ts`   → parsing tolerante e normalização de respostas da IA
 * - `vic.ts`       → wrapper de invoke-vic + tradução de erros HTTP
 * - `index.ts`     → orquestração (handlers por modo + serve)
 *
 * Cada handler segue o mesmo formato:
 *   1. Valida campos do body específicos do modo.
 *   2. Monta `userQuestion` (prompt) e `contextData`.
 *   3. Chama `callInvokeVic`.
 *   4. Passa o conteúdo bruto pelo parser tolerante.
 *   5. Devolve via `jsonResponse`.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  errorResponse,
  jsonResponse,
  logRequestCompletion,
  withMiddleware,
} from '../_shared/middleware.ts';
import type { RequestBody } from './types.ts';
import { parseAiResponse, parseTeamAnalysisResponse } from './parsers.ts';
import { callInvokeVic } from './vic.ts';

// =============================================================================
// MODE: team-analysis — análise consolidada de todos OKRs de um time
// =============================================================================

async function handleTeamAnalysis(
  body: RequestBody,
  authHeader: string,
  buId: string,
  correlationId: string
): Promise<Response> {
  const { teamId, teamName, objectives, orgObjectives, otherTeamsObjectives } = body;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  if (!objectives?.length) {
    return errorResponse('Objectives required for team-analysis mode', 400, {
      requestId: correlationId,
      error: 'MISSING_OBJECTIVES',
    });
  }

  const isCrossTeamAnalysis = teamId === 'cross-team';
  const sharedSuggestionsLimit = isCrossTeamAnalysis ? 8 : 5;
  const sharedSuggestionsInstruction = isCrossTeamAnalysis
    ? `gere até ${sharedSuggestionsLimit} sugestões distintas e concretas, priorizando pelo menos 6 quando houver evidência suficiente e evitando pares duplicados`
    : `gere até ${sharedSuggestionsLimit} sugestões distintas e concretas`;

  // Build compact objective list — limit description length to save prompt space
  const objectivesList = objectives.map((obj, i) => {
    const krList = (obj.keyResults || []).slice(0, 5).map((kr, j) =>
      `  ${j + 1}. "${kr.title}" (${kr.type || '-'}, ${kr.baseline ?? '-'}→${kr.target ?? '-'}${kr.unit ? ' ' + kr.unit : ''}, dono: ${kr.hasOwner ? 'sim' : 'não'})`
    ).join('\n');
    const desc = obj.description ? ` — ${obj.description.slice(0, 80)}` : '';
    return `${i + 1}. "${obj.title}"${desc}
   Vinculado: ${obj.orgObjectiveTitle || 'NÃO'}
   Time: ${obj.teamName || 'N/A'}
${krList}`;
  }).join('\n');

  const orgObjectivesList = (orgObjectives || []).map((org, i) => {
    const orgKrList = (org.keyResults || []).slice(0, 3).map((kr, j) =>
      `  KR${j + 1}: "${kr.title}" (${kr.baseline ?? '-'}→${kr.target ?? '-'}${kr.unit ? ' ' + kr.unit : ''})`
    ).join('\n');
    return `${i + 1}. "${org.title}"${org.description ? ` — ${org.description.slice(0, 60)}` : ''}
${orgKrList || '  (sem KRs)'}`;
  }).join('\n') || 'Nenhum OKR org definido';

  const otherTeamsList = isCrossTeamAnalysis
    ? (otherTeamsObjectives || []).map((team) => team.teamName).join(', ') || 'Nenhum'
    : (otherTeamsObjectives || []).map((team) =>
        `${team.teamName}: ${team.objectives.map(o => `"${o.title}"`).join(', ')}`
      ).join('\n') || 'Nenhum';

  // Build prompt and enforce 9500 char limit
  const promptParts = {
    header: `Análise consolidada de OKRs. Responda em JSON.\n\nTIME: ${teamName || 'N/A'}\n`,
    objectives: `\nOBJETIVOS (${objectives.length}):\n${objectivesList}\n`,
    orgObjectives: `\nOKRs ORG:\n${orgObjectivesList}\n`,
    otherTeams: `\nOUTROS TIMES:\n${otherTeamsList}\n`,
    instructions: `\nAnalise: 1) Score consolidado (0-100), 2) Resumo executivo, 3) Alinhamento com OKRs org (cobertos vs não cobertos), 4) Sugestões de objetivos compartilhados entre times (${sharedSuggestionsInstruction}).\n\nJSON exato:\n{"consolidatedScore":N,"consolidatedSummary":"...","orgAlignmentAnalysis":{"score":N,"coveredOrgObjectives":["..."],"uncoveredOrgObjectives":["..."],"feedback":"..."},"sharedSuggestions":[{"objectiveId":"...","objectiveTitle":"...","suggestedTeamId":"...","suggestedTeamName":"...","suggestedLeaderFirstName":"...","suggestedObjectiveId":"...","suggestedObjectiveTitle":"...","reason":"..."}]}`,
  };

  let userQuestion = promptParts.header + promptParts.objectives + promptParts.orgObjectives + promptParts.otherTeams + promptParts.instructions;

  if (userQuestion.length > 9500) {
    console.log(`[cross-team] Prompt too large (${userQuestion.length}), trimming other teams`);
    userQuestion = promptParts.header + promptParts.objectives + promptParts.orgObjectives + '\nOUTROS TIMES: (omitido por tamanho)\n' + promptParts.instructions;
  }

  if (userQuestion.length > 9500) {
    console.log(`[cross-team] Still too large (${userQuestion.length}), trimming objectives`);
    const maxObjChars = 9500 - promptParts.header.length - promptParts.orgObjectives.length - promptParts.instructions.length - 200;
    const truncatedObjectives = objectivesList.slice(0, Math.max(500, maxObjChars));
    userQuestion = promptParts.header + `\nOBJETIVOS (${objectives.length}, resumido):\n${truncatedObjectives}\n` + promptParts.orgObjectives + promptParts.instructions;
  }

  console.log(`[cross-team] Final prompt length: ${userQuestion.length} chars`);

  const contextData = {
    type: 'okr_team_analysis',
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
    agentSlug: 'validador-metodologico-okrs',
    actionContext: 'okr_team_analysis',
    context: contextData,
    userQuestion,
  });

  if (error) return error;

  const teamAnalysis = parseTeamAnalysisResponse(content!);
  console.log('[okr-construction-review] Team analysis generated, score:', teamAnalysis.consolidatedScore);

  return jsonResponse({ teamAnalysis });
}

// =============================================================================
// MODE: org-objective — avaliação de OKR organizacional (C-Level)
// =============================================================================

async function handleOrgObjective(
  body: RequestBody,
  authHeader: string,
  buId: string,
  correlationId: string
): Promise<Response> {
  const { objectiveId, objectiveTitle, objectiveDescription, keyResults: orgKrs, year } = body;
  const krs = orgKrs || [];
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  console.log('[okr-construction-review] Processing org objective:', objectiveTitle);

  const krList = krs.map((kr, i) =>
    `${i + 1}. "${kr.title}" | Tipo: ${kr.type || 'N/A'} | Baseline: ${kr.baseline ?? 'N/A'} | Target: ${kr.target ?? 'N/A'} ${kr.unit || ''} | Responsável: ${kr.owner_user_id ? 'Definido' : 'Não definido'}`
  ).join('\n');

  const contextData = {
    type: 'okr_org_construction_review',
    objective: {
      id: objectiveId,
      title: objectiveTitle,
      description: objectiveDescription,
    },
    level: 'organizational',
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
    agentSlug: 'validador-metodologico-okrs',
    actionContext: 'okr_org_construction_review',
    context: contextData,
    userQuestion,
  });

  if (error) return error;

  const assessment = parseAiResponse(content!, krs);
  console.log('[okr-construction-review] Org assessment generated, score:', assessment.overallScore);

  return jsonResponse({ assessment });
}

// =============================================================================
// MODE: objective (default) — avaliação de OKR de time
// =============================================================================

async function handleObjective(
  body: RequestBody,
  authHeader: string,
  buId: string,
  correlationId: string
): Promise<Response> {
  const { objectiveId, objectiveTitle, objectiveDescription, teamName, orgObjectiveTitle, keyResults } = body;
  const krs = keyResults || [];
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  console.log('[okr-construction-review] Processing team objective:', objectiveTitle);

  const krList = krs.map((kr, i) =>
    `${i + 1}. "${kr.title}" | Tipo: ${kr.type || 'N/A'} | Baseline: ${kr.baseline ?? 'N/A'} | Target: ${kr.target ?? 'N/A'} ${kr.unit || ''} | Dono: ${kr.owner_user_id ? 'Definido' : 'Não definido'}`
  ).join('\n');

  const contextData = {
    type: 'okr_construction_review',
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
    agentSlug: 'validador-metodologico-okrs',
    actionContext: 'okr_construction_review',
    context: contextData,
    userQuestion,
  });

  if (error) return error;

  const assessment = parseAiResponse(content!, krs);
  console.log('[okr-construction-review] Assessment generated, score:', assessment.overallScore);

  return jsonResponse({ assessment });
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  const result = await withMiddleware(req, {
    requireAuth: true,
    requireBu: false, // BU pode vir do header ou do body
    logRequest: true,
  });

  if (!result.success) {
    return result.error!;
  }

  const ctx = result.context!;
  const correlationId = ctx.requestId;

  try {
    const body: RequestBody = await req.json();

    const buIdFromHeader = req.headers.get('x-current-bu-id');
    const buId = buIdFromHeader || body.buId;

    if (!buId) {
      logRequestCompletion(ctx, 'error', 'Missing BU ID');
      return errorResponse('BU ID required (x-current-bu-id header or buId in body)', 400, {
        requestId: correlationId,
        error: 'MISSING_BU_ID',
      });
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';

    console.log(`[${correlationId}] Mode: ${body.mode || 'objective'}, BU: ${buId}`);

    if (body.mode === 'team-analysis') {
      const response = await handleTeamAnalysis(body, authHeader, buId, correlationId);
      logRequestCompletion(ctx, 'success', 'team-analysis');
      return response;
    }

    const isOrgLevel = body.mode === 'org-objective' || body.isOrgLevel === true;
    if (isOrgLevel) {
      const response = await handleOrgObjective(body, authHeader, buId, correlationId);
      logRequestCompletion(ctx, 'success', 'org-objective');
      return response;
    }

    const response = await handleObjective(body, authHeader, buId, correlationId);
    logRequestCompletion(ctx, 'success', 'objective');
    return response;

  } catch (error) {
    console.error(`[${correlationId}] Error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao processar avaliação',
      500,
      { requestId: correlationId, error: 'INTERNAL_ERROR' }
    );
  }
});
