/**
 * Types para avaliação de construção de OKRs
 * 
 * Checklist manual + avaliação por IA antes do ciclo iniciar
 */

// ============================================================
// CRITÉRIOS DE AVALIAÇÃO
// ============================================================

export type ReviewCriterionId = 
  | 'clarity'           // Clareza e mensurabilidade
  | 'ambition'          // Ambição vs realismo
  | 'alignment'         // Alinhamento estratégico
  | 'ownership'         // Responsabilidade definida
  | 'measurability';    // KRs com métricas claras

export interface ReviewCriterion {
  id: ReviewCriterionId;
  name: string;
  description: string;
  weight: number; // 0-1, soma = 1
  checkItems: CheckItem[];
}

export interface CheckItem {
  id: string;
  label: string;
  helpText?: string;
}

// ============================================================
// AVALIAÇÃO DE UM OBJETIVO
// ============================================================

export interface ObjectiveReview {
  objectiveId: string;
  objectiveTitle: string;
  teamId: string;
  teamName: string;
  krCount: number;
  
  // Checklist manual (user-filled)
  checklist: Record<string, boolean>; // checkItemId -> checked
  
  // AI assessment
  aiAssessment?: AiAssessment;
  aiAssessmentLoading?: boolean;
  aiAssessmentError?: string;
  
  // Computed scores
  checklistScore: number; // 0-100
  aiScore?: number; // 0-100
  combinedScore: number; // 0-100
  status: ReviewStatus;
}

export type ReviewStatus = 'pending' | 'in_review' | 'needs_improvement' | 'approved';

export interface AiAssessment {
  overallScore: number; // 0-100
  summary: string;
  strengths: string[];
  improvements: string[];
  criteriaScores: Record<ReviewCriterionId, {
    score: number;
    feedback: string;
  }>;
  generatedAt: string;
}

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
  avgChecklistScore: number;
  avgAiScore?: number;
  avgCombinedScore: number;
  
  approvedCount: number;
  needsImprovementCount: number;
  pendingCount: number;
}

// ============================================================
// CRITÉRIOS PADRÃO
// ============================================================

export const REVIEW_CRITERIA: ReviewCriterion[] = [
  {
    id: 'clarity',
    name: 'Clareza',
    description: 'O objetivo e KRs são claros e compreensíveis',
    weight: 0.2,
    checkItems: [
      { id: 'clarity_objective', label: 'Objetivo tem linguagem clara e direta', helpText: 'Evita jargões e ambiguidades' },
      { id: 'clarity_kr_titles', label: 'KRs são específicos e bem definidos', helpText: 'Qualquer pessoa entende o que significa' },
    ],
  },
  {
    id: 'measurability',
    name: 'Mensurabilidade',
    description: 'KRs têm métricas numéricas e verificáveis',
    weight: 0.25,
    checkItems: [
      { id: 'measurability_baseline', label: 'Todos KRs têm baseline definido', helpText: 'Valor inicial antes do ciclo' },
      { id: 'measurability_target', label: 'Todos KRs têm meta numérica', helpText: 'Valor alvo ao final do ciclo' },
      { id: 'measurability_unit', label: 'Unidade de medida está clara', helpText: 'Ex: %, R$, unidades, NPS' },
    ],
  },
  {
    id: 'ambition',
    name: 'Ambição vs Realismo',
    description: 'Metas são desafiadoras mas alcançáveis',
    weight: 0.2,
    checkItems: [
      { id: 'ambition_stretch', label: 'Metas são desafiadoras (não triviais)', helpText: '70% de atingimento = sucesso' },
      { id: 'ambition_realistic', label: 'Metas são alcançáveis com esforço', helpText: 'Não são impossíveis ou fantasiosas' },
    ],
  },
  {
    id: 'alignment',
    name: 'Alinhamento Estratégico',
    description: 'Conectado com objetivos do nível acima',
    weight: 0.2,
    checkItems: [
      { id: 'alignment_org', label: 'Objetivo contribui para OKR organizacional', helpText: 'Link com objetivo da empresa' },
      { id: 'alignment_strategy', label: 'Alinhado com prioridades do trimestre', helpText: 'Faz sentido no contexto atual' },
    ],
  },
  {
    id: 'ownership',
    name: 'Responsabilidade',
    description: 'Donos e co-responsáveis definidos',
    weight: 0.15,
    checkItems: [
      { id: 'ownership_owner', label: 'Cada KR tem um dono definido', helpText: 'Pessoa responsável pelo resultado' },
      { id: 'ownership_accountable', label: 'Time sabe quem é accountable', helpText: 'Responsabilidade clara' },
    ],
  },
];

// ============================================================
// HELPERS
// ============================================================

export function getStatusColor(status: ReviewStatus): string {
  switch (status) {
    case 'approved': return 'text-green-600 bg-green-100';
    case 'needs_improvement': return 'text-amber-600 bg-amber-100';
    case 'in_review': return 'text-blue-600 bg-blue-100';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getStatusLabel(status: ReviewStatus): string {
  switch (status) {
    case 'approved': return 'Aprovado';
    case 'needs_improvement': return 'Precisa Melhorar';
    case 'in_review': return 'Em Revisão';
    default: return 'Pendente';
  }
}

export function calculateChecklistScore(
  checklist: Record<string, boolean>,
  criteria: ReviewCriterion[]
): number {
  let totalWeight = 0;
  let weightedScore = 0;

  for (const criterion of criteria) {
    const itemIds = criterion.checkItems.map(item => item.id);
    const checkedCount = itemIds.filter(id => checklist[id]).length;
    const criterionScore = itemIds.length > 0 ? (checkedCount / itemIds.length) * 100 : 0;
    
    weightedScore += criterionScore * criterion.weight;
    totalWeight += criterion.weight;
  }

  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
}

export function determineReviewStatus(
  checklistScore: number,
  aiScore?: number
): ReviewStatus {
  const score = aiScore !== undefined ? (checklistScore + aiScore) / 2 : checklistScore;
  
  if (score >= 80) return 'approved';
  if (score >= 50) return 'needs_improvement';
  if (score > 0) return 'in_review';
  return 'pending';
}
