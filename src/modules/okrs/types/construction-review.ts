/**
 * Types para avaliação de construção de OKRs
 * 
 * Avaliação AUTOMÁTICA por IA antes do ciclo iniciar
 */

// ============================================================
// CRITÉRIOS DE AVALIAÇÃO
// ============================================================

export type ReviewCriterionId = 
  | 'clarity'
  | 'ambition'
  | 'alignment'
  | 'ownership'
  | 'measurability';

export interface ReviewCriterion {
  id: ReviewCriterionId;
  name: string;
  description: string;
  weight: number;
}

// ============================================================
// FEEDBACK POR KEY RESULT
// ============================================================

export interface KrFeedback {
  krId: string;
  krTitle: string;
  score: number;
  strengths: string[];
  improvements: string[];
  isTask: boolean; // Se parece mais task do que KR
}

// ============================================================
// AVALIAÇÃO IA
// ============================================================

export interface AiAssessment {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  alignmentSuggestion: string; // Como melhorar alinhamento com OKRs organizacionais
  criteriaScores: Record<ReviewCriterionId, {
    score: number;
    feedback: string;
  }>;
  krFeedback: KrFeedback[];
  generatedAt: string;
}

// ============================================================
// SUGESTÃO DE OBJETIVOS COMPARTILHADOS
// ============================================================

export interface SharedObjectiveSuggestion {
  objectiveId: string;          // Objetivo do time sendo avaliado
  objectiveTitle: string;
  suggestedTeamId: string;      // Time com sinergia
  suggestedTeamName: string;
  suggestedLeaderFirstName: string;
  suggestedObjectiveId: string;
  suggestedObjectiveTitle: string;
  reason: string;               // Por que a IA identificou sinergia
}

// ============================================================
// ANÁLISE CONSOLIDADA DO TIME
// ============================================================

export interface OrgAlignmentAnalysis {
  score: number;
  coveredOrgObjectives: string[];   // Títulos dos objetivos org cobertos
  uncoveredOrgObjectives: string[]; // Títulos sem cobertura
  feedback: string;
}

export interface TeamAnalysisResult {
  // Score consolidado do time
  consolidatedScore: number;
  consolidatedSummary: string;
  
  // Avaliação de alinhamento com OKRs organizacionais
  orgAlignmentAnalysis: OrgAlignmentAnalysis;
  
  // Sugestões de objetivos compartilhados
  sharedSuggestions: SharedObjectiveSuggestion[];
  
  generatedAt: string;
}

// ============================================================
// DADOS DE CONTEXTO PARA ANÁLISE
// ============================================================

export interface OtherTeamObjectives {
  teamId: string;
  teamName: string;
  leaderFirstName: string;
  objectives: Array<{
    id: string;
    title: string;
  }>;
}

export interface OrgObjective {
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
}

// ============================================================
// AVALIAÇÃO DE UM OBJETIVO
// ============================================================

export interface ObjectiveReview {
  objectiveId: string;
  objectiveTitle: string;
  objectiveDescription?: string;
  teamId: string;
  teamName: string;
  orgObjectiveTitle?: string;
  krCount: number;
  keyResults: {
    id: string;
    title: string;
    type: string | null;
    baseline: number | null;
    target: number | null;
    unit: string | null;
    hasOwner: boolean;
  }[];
  
  // AI assessment (automático)
  aiAssessment?: AiAssessment;
  aiAssessmentLoading?: boolean;
  aiAssessmentError?: string;
  
  // Score (vem da IA)
  score: number;
  status: ReviewStatus;
}

export type ReviewStatus = 'pending' | 'analyzing' | 'needs_improvement' | 'approved';

// ============================================================
// DADOS DO TIME
// ============================================================

export interface TeamConstructionReview {
  teamId: string;
  teamName: string;
  cycleId: string;
  cycleName: string;
  
  objectives: ObjectiveReview[];
  
  // Aggregated scores
  avgScore: number;
  
  approvedCount: number;
  needsImprovementCount: number;
  pendingCount: number;
  
  // Sugestão global de alinhamento
  globalAlignmentSuggestion?: string;
  
  // Análise consolidada por IA (nova)
  teamAnalysis?: TeamAnalysisResult;
  teamAnalysisLoading?: boolean;
  teamAnalysisError?: string;
}

// ============================================================
// CRITÉRIOS PADRÃO
// ============================================================

export const REVIEW_CRITERIA: ReviewCriterion[] = [
  { id: 'clarity', name: 'Clareza', description: 'Linguagem clara e sem ambiguidades', weight: 0.2 },
  { id: 'measurability', name: 'Mensurabilidade', description: 'KRs com baseline, target e unidade', weight: 0.25 },
  { id: 'ambition', name: 'Ambição', description: 'Metas stretch mas alcançáveis', weight: 0.2 },
  { id: 'alignment', name: 'Alinhamento', description: 'Conectado com OKRs organizacionais', weight: 0.2 },
  { id: 'ownership', name: 'Responsabilidade', description: 'Cada KR tem um dono', weight: 0.15 },
];

// ============================================================
// HELPERS
// ============================================================

export function getStatusColor(status: ReviewStatus): string {
  switch (status) {
    case 'approved': return 'text-green-600 bg-green-100';
    case 'needs_improvement': return 'text-amber-600 bg-amber-100';
    case 'analyzing': return 'text-blue-600 bg-blue-100';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getStatusLabel(status: ReviewStatus): string {
  switch (status) {
    case 'approved': return 'Aprovado';
    case 'needs_improvement': return 'Precisa Melhorar';
    case 'analyzing': return 'Analisando...';
    default: return 'Pendente';
  }
}

export function determineReviewStatus(score?: number): ReviewStatus {
  if (score === undefined) return 'pending';
  if (score >= 80) return 'approved';
  if (score >= 50) return 'needs_improvement';
  return 'needs_improvement';
}
