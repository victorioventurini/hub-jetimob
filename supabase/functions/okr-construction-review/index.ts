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
function extractJsonPayload(content: string): string {
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

function clampScore(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function sanitizeLooseText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\\n/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s`"'{}\[\](),:]+/, '')
    .replace(/[\s`"'{}\[\](),:]+$/, '')
    .trim();
}

function sanitizeNarrativeText(value: string | null | undefined): string {
  return sanitizeLooseText(value)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ' ')
    .replace(/^(overallScore|summary|strengths|improvements|alignmentSuggestion|criteriaScores|krFeedback|consolidatedScore|consolidatedSummary|orgAlignmentAnalysis|sharedSuggestions)\s*:?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMeaningfulNarrativeText(value: string | null | undefined): boolean {
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

function extractFieldRawValue(source: string, field: string): string | null {
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

function extractNumberField(source: string, field: string): number | null {
  const rawValue = extractFieldRawValue(source, field);
  if (!rawValue) return null;

  const match = rawValue.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  return Number(match[0]);
}

function parseLooseStringArray(rawValue: string | null | undefined): string[] {
  if (!rawValue) return [];

  return Array.from(rawValue.matchAll(/"([^\"]+)"/g))
    .map((match) => sanitizeNarrativeText(match[1]))
    .filter((item) => isMeaningfulNarrativeText(item))
    .slice(0, 5);
}

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

function normalizeAiAssessment(raw: Partial<AiAssessment>, keyResults: KeyResult[]): AiAssessment {
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
      .replace(/[{}\[\]]/g, ' ')
      .slice(0, 320)
  );

  return isMeaningfulNarrativeText(cleaned) ? cleaned : fallback;
}

function parseAiResponse(content: string, keyResults: KeyResult[]): AiAssessment {
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

/**
 * Create assessment from text response when JSON is not available
 */
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
  const improvementPatterns = text.match(/(?:\-|melhoria|sugestão|melhorar)[:\s]*([^\n]+)/gi);
  if (improvementPatterns) {
    improvements.push(
      ...improvementPatterns
        .slice(0, 3)
        .map((item) => sanitizeNarrativeText(item.replace(/^(?:\-|melhoria|sugestão|melhorar)[:\s]*/i, '')))
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
        .slice(0, 5);
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
    .slice(0, 5);
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

/**
 * Parse team analysis response into structured format
 */
function parseTeamAnalysisResponse(content: string): TeamAnalysisResult {
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

  // Compact other teams list — just titles
  const otherTeamsList = (otherTeamsObjectives || []).map(team => 
    `${team.teamName}: ${team.objectives.map(o => `"${o.title}"`).join(', ')}`
  ).join('\n') || 'Nenhum';

  // Build prompt and enforce 9500 char limit
  const promptParts = {
    header: `Análise consolidada de OKRs. Responda em JSON.\n\nTIME: ${teamName || 'N/A'}\n`,
    objectives: `\nOBJETIVOS (${objectives.length}):\n${objectivesList}\n`,
    orgObjectives: `\nOKRs ORG:\n${orgObjectivesList}\n`,
    otherTeams: `\nOUTROS TIMES:\n${otherTeamsList}\n`,
    instructions: `\nAnalise: 1) Score consolidado (0-100), 2) Resumo executivo, 3) Alinhamento com OKRs org (cobertos vs não cobertos), 4) Sugestões de objetivos compartilhados entre times.\n\nJSON exato:\n{"consolidatedScore":N,"consolidatedSummary":"...","orgAlignmentAnalysis":{"score":N,"coveredOrgObjectives":["..."],"uncoveredOrgObjectives":["..."],"feedback":"..."},"sharedSuggestions":[{"objectiveId":"...","objectiveTitle":"...","suggestedTeamId":"...","suggestedTeamName":"...","suggestedLeaderFirstName":"...","suggestedObjectiveId":"...","suggestedObjectiveTitle":"...","reason":"..."}]}`,
  };

  let userQuestion = promptParts.header + promptParts.objectives + promptParts.orgObjectives + promptParts.otherTeams + promptParts.instructions;

  // If still too large, progressively trim
  if (userQuestion.length > 9500) {
    console.log(`[cross-team] Prompt too large (${userQuestion.length}), trimming other teams`);
    // Remove other teams section first
    userQuestion = promptParts.header + promptParts.objectives + promptParts.orgObjectives + '\nOUTROS TIMES: (omitido por tamanho)\n' + promptParts.instructions;
  }

  if (userQuestion.length > 9500) {
    console.log(`[cross-team] Still too large (${userQuestion.length}), trimming objectives`);
    // Truncate objectives to fit
    const maxObjChars = 9500 - promptParts.header.length - promptParts.orgObjectives.length - promptParts.instructions.length - 200;
    const truncatedObjectives = objectivesList.slice(0, Math.max(500, maxObjChars));
    userQuestion = promptParts.header + `\nOBJETIVOS (${objectives.length}, resumido):\n${truncatedObjectives}\n` + promptParts.orgObjectives + promptParts.instructions;
  }

  console.log(`[cross-team] Final prompt length: ${userQuestion.length} chars`);

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
