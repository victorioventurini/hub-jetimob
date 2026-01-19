/**
 * Types for Organizational OKR Health Review
 * 
 * Focado na análise de EXECUÇÃO (durante o ciclo)
 * Diferente do Construction Review que avalia CONSTRUÇÃO (antes do ciclo)
 */

// ============================================================
// KR HEALTH DATA
// ============================================================

export interface LinkedTeamKr {
  teamId: string;
  teamName: string;
  teamKrId: string;
  teamKrTitle: string;
  teamKrProgress: number;
  lastCheckinAt: string | null;
}

export interface OrgKrHealthData {
  id: string;
  title: string;
  baseline: number | null;
  target: number | null;
  currentValue: number | null;
  unit: string | null;
  progress: number;
  status: 'green' | 'yellow' | 'red';
  lastCheckinAt: string | null;
  linkedTeams: LinkedTeamKr[];
}

// ============================================================
// AI ANALYSIS TYPES
// ============================================================

export interface OrgHealthAiAnalysis {
  healthScore: number; // 0-100
  status: 'healthy' | 'attention' | 'risk';
  summary: string;
  strengths: string[];
  risks: string[];
  suggestedActions: string[];
  generatedAt: string;
}

export interface ConsolidatedOrgAnalysis {
  overallHealthScore: number;
  overallStatus: 'healthy' | 'attention' | 'risk';
  summary: string;
  topRisks: Array<{ objectiveTitle: string; risk: string }>;
  topStrengths: Array<{ objectiveTitle: string; strength: string }>;
  recommendations: string[];
  generatedAt: string;
}

// ============================================================
// OBJECTIVE HEALTH REVIEW
// ============================================================

export interface OrgObjectiveHealthReview {
  objectiveId: string;
  objectiveTitle: string;
  objectiveDescription?: string;
  progress: number;
  krCount: number;
  linkedTeamsCount: number;
  healthScore: number;
  healthStatus: 'healthy' | 'attention' | 'risk';
  lastCheckinAt: string | null;
  
  // KRs detalhados
  keyResults: OrgKrHealthData[];
  
  // Análise IA
  aiAnalysis?: OrgHealthAiAnalysis;
  aiAnalysisLoading?: boolean;
  aiAnalysisError?: string;
}

// ============================================================
// OVERALL DATA STRUCTURE
// ============================================================

export interface OrgHealthReviewData {
  year: number;
  objectives: OrgObjectiveHealthReview[];
  
  // Scores calculados
  scores: {
    cohesion: number;
    distribution: number;
    coverage: number;
    traceability: number;
    overall: number;
  };
  
  // Contadores
  counts: {
    totalObjectives: number;
    healthyCount: number;
    attentionCount: number;
    riskCount: number;
  };
  
  // Análise consolidada
  consolidatedAnalysis?: ConsolidatedOrgAnalysis;
  consolidatedAnalysisLoading: boolean;
  consolidatedAnalysisError?: string;
  
  // Estados
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  reEvaluateObjective: (objectiveId: string) => void;
  refreshConsolidatedAnalysis: () => void;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getHealthStatusColor(status: 'healthy' | 'attention' | 'risk'): string {
  switch (status) {
    case 'healthy':
      return 'text-success bg-success-muted border-success/30';
    case 'attention':
      return 'text-warning bg-warning-muted border-warning/30';
    case 'risk':
      return 'text-destructive bg-destructive/10 border-destructive/30';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

export function getHealthStatusLabel(status: 'healthy' | 'attention' | 'risk'): string {
  switch (status) {
    case 'healthy':
      return 'Saudável';
    case 'attention':
      return 'Atenção';
    case 'risk':
      return 'Em Risco';
    default:
      return 'Desconhecido';
  }
}

export function getHealthStatusEmoji(status: 'healthy' | 'attention' | 'risk'): string {
  switch (status) {
    case 'healthy':
      return '🟢';
    case 'attention':
      return '🟡';
    case 'risk':
      return '🔴';
    default:
      return '⚪';
  }
}

export function determineHealthStatus(score: number): 'healthy' | 'attention' | 'risk' {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'attention';
  return 'risk';
}

export function getProgressStatus(progress: number): 'green' | 'yellow' | 'red' {
  if (progress >= 70) return 'green';
  if (progress >= 40) return 'yellow';
  return 'red';
}
