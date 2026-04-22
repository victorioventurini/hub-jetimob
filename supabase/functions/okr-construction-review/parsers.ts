/**
 * Parsers tolerantes a respostas "sujas" do agente validador-metodologico-okrs.
 *
 * Por que tanto código de salvage:
 * Mesmo com instrução "responda APENAS em JSON", a Gemini ocasionalmente devolve:
 *   - JSON dentro de ```json ... ``` (com texto livre antes/depois)
 *   - Strings não escapadas, vírgulas finais, números como string
 *   - Resposta truncada (tokens insuficientes)
 *
 * Em vez de jogar fora a avaliação inteira, extraímos progressivamente:
 *   1. Tenta JSON.parse direto.
 *   2. Tenta `parseLooseAiAssessment` — regex balanceada por campo.
 *   3. Cai para `createTextBasedAssessment` — heurística textual.
 *
 * Saída SEMPRE normalizada via `normalizeAiAssessment` / `normalizeTeamAnalysis`,
 * preenchendo defaults para garantir contrato estável com o front (que assume
 * todos os campos presentes).
 */

import type {
  AiAssessment,
  CriteriaScore,
  KeyResult,
  KrFeedback,
  SharedObjectiveSuggestion,
  TeamAnalysisResult,
} from './types.ts';

// =============================================================================
// PRIMITIVES — extração tolerante de campos
// =============================================================================

export function extractJsonPayload(content: string): string {
  let jsonStr = content.trim();

  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return jsonStr.slice(firstBrace, lastBrace + 1).trim();
  }

  return jsonStr;
}

export function clampScore(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function sanitizeLooseText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\\n/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s`"'{}[\](),:]+/, '')
    .replace(/[\s`"'{}[\](),:]+$/, '')
    .trim();
}

export function sanitizeNarrativeText(value: string | null | undefined): string {
  return sanitizeLooseText(value)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ' ')
    .replace(/^(overallScore|summary|strengths|improvements|alignmentSuggestion|criteriaScores|krFeedback|consolidatedScore|consolidatedSummary|orgAlignmentAnalysis|sharedSuggestions)\s*:?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isMeaningfulNarrativeText(value: string | null | undefined): boolean {
  const cleaned = sanitizeNarrativeText(value);
  return cleaned.length >= 3 && !/^(null|undefined|true|false)$/i.test(cleaned);
}

function extractQuotedValue(source: string, startIndex: number): string | null {
  if (source[startIndex] !== '"') return null;

  let value = '';
  let escaped = false;

  for (let i = startIndex + 1; i < source.length; i++) {
    const char = source[i];

    if (escaped) {
      value += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      value += char;
      continue;
    }

    if (char === '"') {
      return value;
    }

    value += char;
  }

  return value;
}

function extractBalancedBlock(source: string, startIndex: number, openChar: string, closeChar: string): string | null {
  if (source[startIndex] !== openChar) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, i + 1);
      }
    }
  }

  return source.slice(startIndex).trim() || null;
}

export function extractFieldRawValue(source: string, field: string): string | null {
  const match = new RegExp(`"${field}"\\s*:\\s*`, 'i').exec(source);
  if (!match) return null;

  let cursor = match.index + match[0].length;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;

  const firstChar = source[cursor];
  if (!firstChar) return null;

  if (firstChar === '"') {
    return extractQuotedValue(source, cursor);
  }

  if (firstChar === '{') {
    return extractBalancedBlock(source, cursor, '{', '}');
  }

  if (firstChar === '[') {
    return extractBalancedBlock(source, cursor, '[', ']');
  }

  let end = cursor;
  while (end < source.length && ![',', '}', '\n', '\r'].includes(source[end])) {
    end += 1;
  }

  return source.slice(cursor, end).trim();
}

export function extractNumberField(source: string, field: string): number | null {
  const rawValue = extractFieldRawValue(source, field);
  if (!rawValue) return null;

  const match = rawValue.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  return Number(match[0]);
}

export function parseLooseStringArray(rawValue: string | null | undefined): string[] {
  if (!rawValue) return [];

  return Array.from(rawValue.matchAll(/"([^"]+)"/g))
    .map((match) => sanitizeNarrativeText(match[1]))
    .filter((item) => isMeaningfulNarrativeText(item))
    .slice(0, 5);
}

// =============================================================================
// DEFAULTS — usados quando a IA falha em devolver um campo
// =============================================================================

function buildDefaultKrFeedback(keyResults: KeyResult[]): KrFeedback[] {
  return keyResults.map((kr) => {
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
}

function buildDefaultCriteriaScores(keyResults: KeyResult[]): AiAssessment['criteriaScores'] {
  const hasOwnersForAllKrs = keyResults.every((kr) => kr.owner_user_id);

  return {
    clarity: { score: 70, feedback: 'Avaliação baseada em análise textual' },
    measurability: { score: 60, feedback: 'Alguns KRs podem precisar de métricas mais claras' },
    ambition: { score: 65, feedback: 'Considere se as metas são desafiadoras mas alcançáveis' },
    alignment: { score: 65, feedback: 'Verifique conexão com objetivos organizacionais' },
    ownership: {
      score: hasOwnersForAllKrs ? 85 : 50,
      feedback: hasOwnersForAllKrs ? 'Todos KRs têm responsável' : 'Alguns KRs sem responsável definido',
    },
  };
}

function extractCriteriaScore(source: string, field: keyof AiAssessment['criteriaScores'], fallback: CriteriaScore): CriteriaScore {
  const rawValue = extractFieldRawValue(source, field);
  if (!rawValue || !rawValue.startsWith('{')) return fallback;

  return {
    score: clampScore(extractNumberField(rawValue, 'score'), fallback.score),
    feedback: isMeaningfulNarrativeText(extractFieldRawValue(rawValue, 'feedback'))
      ? sanitizeNarrativeText(extractFieldRawValue(rawValue, 'feedback'))
      : fallback.feedback,
  };
}

// =============================================================================
// AI ASSESSMENT (single objective)
// =============================================================================

export function normalizeAiAssessment(raw: Partial<AiAssessment>, keyResults: KeyResult[]): AiAssessment {
  const defaultCriteriaScores = buildDefaultCriteriaScores(keyResults);
  const defaultKrFeedback = buildDefaultKrFeedback(keyResults);

  const normalizedKrFeedback = Array.isArray(raw.krFeedback)
    ? raw.krFeedback
        .map((feedback, index) => ({
          krId: sanitizeLooseText(feedback?.krId) || keyResults[index]?.id || `kr-${index + 1}`,
          krTitle: sanitizeLooseText(feedback?.krTitle) || keyResults[index]?.title || `KR ${index + 1}`,
          score: clampScore(feedback?.score, defaultKrFeedback[index]?.score ?? 60),
          strengths: Array.isArray(feedback?.strengths)
            ? feedback.strengths.map((item) => sanitizeNarrativeText(item)).filter((item) => isMeaningfulNarrativeText(item))
            : defaultKrFeedback[index]?.strengths ?? [],
          improvements: Array.isArray(feedback?.improvements)
            ? feedback.improvements.map((item) => sanitizeNarrativeText(item)).filter((item) => isMeaningfulNarrativeText(item))
            : defaultKrFeedback[index]?.improvements ?? [],
          isTask: Boolean(feedback?.isTask),
        }))
        .filter((feedback) => feedback.krTitle)
    : defaultKrFeedback;

  return {
    overallScore: clampScore(raw.overallScore, 65),
    summary: isMeaningfulNarrativeText(raw.summary)
      ? sanitizeNarrativeText(raw.summary)
      : 'A IA avaliou o objetivo, mas a resposta veio parcialmente corrompida. Reavalie se precisar de um resumo mais detalhado.',
    strengths: Array.isArray(raw.strengths)
      ? raw.strengths.map((item) => sanitizeNarrativeText(item)).filter((item) => isMeaningfulNarrativeText(item)).slice(0, 3)
      : [],
    improvements: Array.isArray(raw.improvements)
      ? raw.improvements.map((item) => sanitizeNarrativeText(item)).filter((item) => isMeaningfulNarrativeText(item)).slice(0, 3)
      : [],
    alignmentSuggestion: isMeaningfulNarrativeText(raw.alignmentSuggestion)
      ? sanitizeNarrativeText(raw.alignmentSuggestion)
      : 'Verifique se os KRs contribuem diretamente para o objetivo organizacional.',
    criteriaScores: {
      clarity: raw.criteriaScores?.clarity
        ? { score: clampScore(raw.criteriaScores.clarity.score, defaultCriteriaScores.clarity.score), feedback: sanitizeNarrativeText(raw.criteriaScores.clarity.feedback) || defaultCriteriaScores.clarity.feedback }
        : defaultCriteriaScores.clarity,
      measurability: raw.criteriaScores?.measurability
        ? { score: clampScore(raw.criteriaScores.measurability.score, defaultCriteriaScores.measurability.score), feedback: sanitizeNarrativeText(raw.criteriaScores.measurability.feedback) || defaultCriteriaScores.measurability.feedback }
        : defaultCriteriaScores.measurability,
      ambition: raw.criteriaScores?.ambition
        ? { score: clampScore(raw.criteriaScores.ambition.score, defaultCriteriaScores.ambition.score), feedback: sanitizeNarrativeText(raw.criteriaScores.ambition.feedback) || defaultCriteriaScores.ambition.feedback }
        : defaultCriteriaScores.ambition,
      alignment: raw.criteriaScores?.alignment
        ? { score: clampScore(raw.criteriaScores.alignment.score, defaultCriteriaScores.alignment.score), feedback: sanitizeNarrativeText(raw.criteriaScores.alignment.feedback) || defaultCriteriaScores.alignment.feedback }
        : defaultCriteriaScores.alignment,
      ownership: raw.criteriaScores?.ownership
        ? { score: clampScore(raw.criteriaScores.ownership.score, defaultCriteriaScores.ownership.score), feedback: sanitizeNarrativeText(raw.criteriaScores.ownership.feedback) || defaultCriteriaScores.ownership.feedback }
        : defaultCriteriaScores.ownership,
    },
    krFeedback: normalizedKrFeedback.length > 0 ? normalizedKrFeedback : defaultKrFeedback,
    generatedAt: new Date().toISOString(),
  };
}

function parseLooseAiAssessment(content: string, keyResults: KeyResult[]): AiAssessment | null {
  const jsonLike = extractJsonPayload(content);
  const criteriaRaw = extractFieldRawValue(jsonLike, 'criteriaScores') || '';

  const summary = extractFieldRawValue(jsonLike, 'summary');
  const strengths = parseLooseStringArray(extractFieldRawValue(jsonLike, 'strengths'));
  const improvements = parseLooseStringArray(extractFieldRawValue(jsonLike, 'improvements'));
  const alignmentSuggestion = extractFieldRawValue(jsonLike, 'alignmentSuggestion');
  const overallScore = extractNumberField(jsonLike, 'overallScore') ?? extractNumberField(jsonLike, 'score');

  const hasRecoverableContent =
    overallScore !== null ||
    isMeaningfulNarrativeText(summary) ||
    strengths.length > 0 ||
    improvements.length > 0 ||
    isMeaningfulNarrativeText(alignmentSuggestion);

  if (!hasRecoverableContent) return null;

  const defaults = buildDefaultCriteriaScores(keyResults);

  return normalizeAiAssessment({
    overallScore: overallScore ?? undefined,
    summary: summary ? sanitizeNarrativeText(summary) : undefined,
    strengths,
    improvements,
    alignmentSuggestion: alignmentSuggestion ? sanitizeNarrativeText(alignmentSuggestion) : undefined,
    criteriaScores: {
      clarity: extractCriteriaScore(criteriaRaw, 'clarity', defaults.clarity),
      measurability: extractCriteriaScore(criteriaRaw, 'measurability', defaults.measurability),
      ambition: extractCriteriaScore(criteriaRaw, 'ambition', defaults.ambition),
      alignment: extractCriteriaScore(criteriaRaw, 'alignment', defaults.alignment),
      ownership: extractCriteriaScore(criteriaRaw, 'ownership', defaults.ownership),
    },
  }, keyResults);
}

function extractFreeTextSummary(text: string, fallback: string): string {
  const recoveredSummary = extractFieldRawValue(text, 'summary');
  if (isMeaningfulNarrativeText(recoveredSummary)) {
    return sanitizeNarrativeText(recoveredSummary);
  }

  const cleaned = sanitizeNarrativeText(
    text
      .replace(/```json|```/g, ' ')
      .replace(/"[^"]+"\s*:/g, ' ')
      .replace(/[{}[\]]/g, ' ')
      .slice(0, 320)
  );

  return isMeaningfulNarrativeText(cleaned) ? cleaned : fallback;
}

export function parseAiResponse(content: string, keyResults: KeyResult[]): AiAssessment {
  const jsonStr = extractJsonPayload(content);

  try {
    const parsed = JSON.parse(jsonStr);
    return normalizeAiAssessment(parsed, keyResults);
  } catch {
    const recovered = parseLooseAiAssessment(content, keyResults);
    if (recovered) return recovered;

    console.log("[okr-construction-review] JSON parse failed, creating structured response from text");
    return createTextBasedAssessment(content, keyResults);
  }
}

function createTextBasedAssessment(text: string, keyResults: KeyResult[]): AiAssessment {
  const scoreMatch = text.match(/(?:score|nota|pontuação)[:\s]*(\d+)/i) || text.match(/(\d+)\s*\/\s*100/);
  const overallScore = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 65;

  const strengths: string[] = [];
  const strengthPatterns = text.match(/(?:\+|ponto\s+forte|destaque)[:\s]*([^\n]+)/gi);
  if (strengthPatterns) {
    strengths.push(
      ...strengthPatterns
        .slice(0, 3)
        .map((item) => sanitizeNarrativeText(item.replace(/^(?:\+|ponto\s+forte|destaque)[:\s]*/i, '')))
        .filter((item) => isMeaningfulNarrativeText(item))
    );
  }

  const improvements: string[] = [];
  const improvementPatterns = text.match(/(?:-|melhoria|sugestão|melhorar)[:\s]*([^\n]+)/gi);
  if (improvementPatterns) {
    improvements.push(
      ...improvementPatterns
        .slice(0, 3)
        .map((item) => sanitizeNarrativeText(item.replace(/^(?:-|melhoria|sugestão|melhorar)[:\s]*/i, '')))
        .filter((item) => isMeaningfulNarrativeText(item))
    );
  }

  return normalizeAiAssessment({
    overallScore,
    summary: extractFreeTextSummary(text, 'A IA avaliou a qualidade de construção deste objetivo.'),
    strengths: strengths.length > 0 ? strengths : ['Objetivo definido'],
    improvements: improvements.length > 0 ? improvements : ['Revisar métricas dos KRs'],
    alignmentSuggestion: 'Verifique se os KRs contribuem diretamente para o objetivo organizacional.',
    criteriaScores: buildDefaultCriteriaScores(keyResults),
    krFeedback: buildDefaultKrFeedback(keyResults),
  }, keyResults);
}

// =============================================================================
// TEAM ANALYSIS (consolidated)
// =============================================================================

function normalizeSharedSuggestion(raw: Partial<SharedObjectiveSuggestion>): SharedObjectiveSuggestion | null {
  const objectiveTitle = sanitizeNarrativeText(raw.objectiveTitle);
  const suggestedTeamName = sanitizeNarrativeText(raw.suggestedTeamName);
  const suggestedObjectiveTitle = sanitizeNarrativeText(raw.suggestedObjectiveTitle);

  if (!objectiveTitle || !suggestedTeamName || !suggestedObjectiveTitle) return null;

  return {
    objectiveId: sanitizeLooseText(raw.objectiveId) || 'unknown-objective',
    objectiveTitle,
    suggestedTeamId: sanitizeLooseText(raw.suggestedTeamId) || 'unknown-team',
    suggestedTeamName,
    suggestedLeaderFirstName: sanitizeNarrativeText(raw.suggestedLeaderFirstName) || 'alguém',
    suggestedObjectiveId: sanitizeLooseText(raw.suggestedObjectiveId) || 'unknown-objective',
    suggestedObjectiveTitle,
    reason: sanitizeNarrativeText(raw.reason) || 'A IA identificou sinergia entre estes objetivos.',
  };
}

function extractObjectBlocks(source: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        blocks.push(source.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return blocks;
}

function parseLooseSharedSuggestions(rawValue: string | null | undefined): SharedObjectiveSuggestion[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeSharedSuggestion(item))
        .filter((item): item is SharedObjectiveSuggestion => item !== null)
        .slice(0, 12);
    }
  } catch {
    // noop - continue with loose parsing
  }

  return extractObjectBlocks(rawValue)
    .map((block) => normalizeSharedSuggestion({
      objectiveId: extractFieldRawValue(block, 'objectiveId') || undefined,
      objectiveTitle: extractFieldRawValue(block, 'objectiveTitle') || undefined,
      suggestedTeamId: extractFieldRawValue(block, 'suggestedTeamId') || undefined,
      suggestedTeamName: extractFieldRawValue(block, 'suggestedTeamName') || undefined,
      suggestedLeaderFirstName: extractFieldRawValue(block, 'suggestedLeaderFirstName') || undefined,
      suggestedObjectiveId: extractFieldRawValue(block, 'suggestedObjectiveId') || undefined,
      suggestedObjectiveTitle: extractFieldRawValue(block, 'suggestedObjectiveTitle') || undefined,
      reason: extractFieldRawValue(block, 'reason') || undefined,
    }))
    .filter((item): item is SharedObjectiveSuggestion => item !== null)
    .slice(0, 12);
}

function normalizeTeamAnalysis(raw: Partial<TeamAnalysisResult> & { orgAlignmentAnalysis?: Partial<TeamAnalysisResult['orgAlignmentAnalysis']> }): TeamAnalysisResult {
  return {
    consolidatedScore: clampScore(raw.consolidatedScore, 70),
    consolidatedSummary: isMeaningfulNarrativeText(raw.consolidatedSummary)
      ? sanitizeNarrativeText(raw.consolidatedSummary)
      : 'A IA gerou uma análise consolidada, mas o resumo veio parcialmente corrompido.',
    orgAlignmentAnalysis: {
      score: clampScore(raw.orgAlignmentAnalysis?.score, 70),
      coveredOrgObjectives: Array.isArray(raw.orgAlignmentAnalysis?.coveredOrgObjectives)
        ? raw.orgAlignmentAnalysis.coveredOrgObjectives.map((item) => sanitizeNarrativeText(item)).filter((item) => isMeaningfulNarrativeText(item))
        : [],
      uncoveredOrgObjectives: Array.isArray(raw.orgAlignmentAnalysis?.uncoveredOrgObjectives)
        ? raw.orgAlignmentAnalysis.uncoveredOrgObjectives.map((item) => sanitizeNarrativeText(item)).filter((item) => isMeaningfulNarrativeText(item))
        : [],
      feedback: isMeaningfulNarrativeText(raw.orgAlignmentAnalysis?.feedback)
        ? sanitizeNarrativeText(raw.orgAlignmentAnalysis?.feedback)
        : 'Análise textual - verifique alinhamento manualmente.',
    },
    sharedSuggestions: Array.isArray(raw.sharedSuggestions)
      ? raw.sharedSuggestions
          .map((item) => normalizeSharedSuggestion(item))
          .filter((item): item is SharedObjectiveSuggestion => item !== null)
      : [],
    generatedAt: new Date().toISOString(),
  };
}

function parseLooseTeamAnalysis(content: string): TeamAnalysisResult | null {
  const jsonLike = extractJsonPayload(content);
  const orgAlignmentRaw = extractFieldRawValue(jsonLike, 'orgAlignmentAnalysis') || '';
  const consolidatedSummary = extractFieldRawValue(jsonLike, 'consolidatedSummary') || extractFieldRawValue(jsonLike, 'summary');
  const consolidatedScore = extractNumberField(jsonLike, 'consolidatedScore') ?? extractNumberField(jsonLike, 'overallScore');
  const sharedSuggestions = parseLooseSharedSuggestions(extractFieldRawValue(jsonLike, 'sharedSuggestions'));

  const hasRecoverableContent =
    consolidatedScore !== null ||
    isMeaningfulNarrativeText(consolidatedSummary) ||
    isMeaningfulNarrativeText(extractFieldRawValue(orgAlignmentRaw, 'feedback')) ||
    sharedSuggestions.length > 0;

  if (!hasRecoverableContent) return null;

  return normalizeTeamAnalysis({
    consolidatedScore: consolidatedScore ?? undefined,
    consolidatedSummary: consolidatedSummary ? sanitizeNarrativeText(consolidatedSummary) : undefined,
    orgAlignmentAnalysis: {
      score: extractNumberField(orgAlignmentRaw, 'score') ?? 70,
      coveredOrgObjectives: parseLooseStringArray(extractFieldRawValue(orgAlignmentRaw, 'coveredOrgObjectives')),
      uncoveredOrgObjectives: parseLooseStringArray(extractFieldRawValue(orgAlignmentRaw, 'uncoveredOrgObjectives')),
      feedback: (extractFieldRawValue(orgAlignmentRaw, 'feedback') ? sanitizeNarrativeText(extractFieldRawValue(orgAlignmentRaw, 'feedback')) : '') || 'Análise textual - verifique alinhamento manualmente.',
    },
    sharedSuggestions,
  });
}

export function parseTeamAnalysisResponse(content: string): TeamAnalysisResult {
  const jsonStr = extractJsonPayload(content);

  try {
    const parsed = JSON.parse(jsonStr);
    return normalizeTeamAnalysis(parsed);
  } catch {
    const recovered = parseLooseTeamAnalysis(content);
    if (recovered) return recovered;

    return normalizeTeamAnalysis({
      consolidatedScore: 70,
      consolidatedSummary: extractFreeTextSummary(content, 'Análise consolidada gerada pela IA.'),
      orgAlignmentAnalysis: {
        score: 70,
        coveredOrgObjectives: [],
        uncoveredOrgObjectives: [],
        feedback: 'Análise textual - verifique alinhamento manualmente.',
      },
      sharedSuggestions: [],
    });
  }
}
