/**
 * useKrStateInsights - Hook centralizado para estados de KR
 * 
 * Reconhece 8 estados distintos de KRs como sinais de gestão:
 * - not_started: KR sem progresso (baseline = current)
 * - healthy: Progresso conforme esperado
 * - stagnant: Sem check-in há 14+ dias
 * - at_risk: RAG yellow ou gap moderado
 * - off_track: RAG red ou gap severo
 * - achieved: Progresso = 100%
 * - exceeded: Progresso > 100%
 * - not_achieved: Ciclo encerrado + progress < 100%
 * 
 * @see docs/guides/WIZARD_DEVELOPMENT_GUIDE.md
 */

import type { LucideIcon } from 'lucide-react';
import { 
  Circle, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  XCircle, 
  Trophy, 
  Rocket, 
  PauseCircle 
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type KrState = 
  | 'not_started' 
  | 'healthy' 
  | 'stagnant' 
  | 'at_risk' 
  | 'off_track' 
  | 'achieved' 
  | 'exceeded' 
  | 'not_achieved';

export type KrStateSeverity = 'info' | 'warning' | 'critical';

export interface KrStateConfig {
  state: KrState;
  label: string;
  description: string;
  severity: KrStateSeverity;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  guidingQuestion: string;
  aiPrompt: string;
}

export interface CalculateKrStateParams {
  progress: number;
  status: 'green' | 'yellow' | 'red' | 'not_started' | null;
  daysSinceCheckin: number;
  cycleEnded: boolean;
  expectedProgress?: number;
}

// ============================================================
// STATE CONFIGURATIONS
// ============================================================

export const KR_STATE_CONFIG: Record<KrState, KrStateConfig> = {
  not_started: {
    state: 'not_started',
    label: 'Não Iniciada',
    description: 'KR ainda não teve progresso',
    severity: 'info',
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    borderClass: 'border-muted',
    guidingQuestion: 'O foco está claro?',
    aiPrompt: 'Esta KR não iniciou. Analise possíveis causas: falta de clareza, priorização baixa ou excesso de carga.',
  },
  healthy: {
    state: 'healthy',
    label: 'Saudável',
    description: 'Progresso conforme esperado',
    severity: 'info',
    icon: TrendingUp,
    colorClass: 'text-status-green',
    bgClass: 'bg-status-green-muted',
    borderClass: 'border-status-green/30',
    guidingQuestion: 'Manter execução.',
    aiPrompt: 'KR em progresso saudável. Nenhuma intervenção necessária.',
  },
  stagnant: {
    state: 'stagnant',
    label: 'Estagnada',
    description: 'Sem atualização há 14+ dias',
    severity: 'warning',
    icon: PauseCircle,
    colorClass: 'text-status-yellow',
    bgClass: 'bg-status-yellow-muted',
    borderClass: 'border-status-yellow/30',
    guidingQuestion: 'O que está travando?',
    aiPrompt: 'Esta KR está estagnada. Investigue bloqueios, dependências externas ou perda de prioridade.',
  },
  at_risk: {
    state: 'at_risk',
    label: 'Em Risco',
    description: 'Progresso abaixo do esperado',
    severity: 'warning',
    icon: AlertTriangle,
    colorClass: 'text-status-yellow',
    bgClass: 'bg-status-yellow-muted',
    borderClass: 'border-status-yellow/30',
    guidingQuestion: 'Decisão necessária?',
    aiPrompt: 'KR em risco de não atingir a meta. Sugira ações de desbloqueio ou reprioritização.',
  },
  off_track: {
    state: 'off_track',
    label: 'Fora do Caminho',
    description: 'Meta não será atingida sem mudança',
    severity: 'critical',
    icon: XCircle,
    colorClass: 'text-status-red',
    bgClass: 'bg-status-red-muted',
    borderClass: 'border-status-red/30',
    guidingQuestion: 'Replanejar?',
    aiPrompt: 'KR fora do caminho. Analise: é hora de replanejar, ajustar escopo ou cancelar?',
  },
  achieved: {
    state: 'achieved',
    label: 'Atingida',
    description: 'Meta 100% concluída',
    severity: 'info',
    icon: CheckCircle2,
    colorClass: 'text-status-green',
    bgClass: 'bg-status-green-muted',
    borderClass: 'border-status-green/30',
    guidingQuestion: 'Algum aprendizado?',
    aiPrompt: 'Meta atingida. Capture aprendizados antes de encerrar.',
  },
  exceeded: {
    state: 'exceeded',
    label: 'Superada',
    description: 'Meta ultrapassada (>100%)',
    severity: 'info',
    icon: Rocket,
    colorClass: 'text-status-green',
    bgClass: 'bg-status-green-muted',
    borderClass: 'border-status-green/30',
    guidingQuestion: 'O que aprendemos para calibrar metas futuras?',
    aiPrompt: 'Meta superada. Analise: foi sizing errado, capacidade subestimada ou alavanca replicável?',
  },
  not_achieved: {
    state: 'not_achieved',
    label: 'Não Atingida',
    description: 'Ciclo encerrado sem atingir meta',
    severity: 'warning',
    icon: Trophy,
    colorClass: 'text-status-red',
    bgClass: 'bg-status-red-muted',
    borderClass: 'border-status-red/30',
    guidingQuestion: 'O problema foi a meta, o plano ou a execução?',
    aiPrompt: 'Meta não atingida. Identifique causa raiz: hipótese errada, ambição excessiva ou execução insuficiente.',
  },
};

// ============================================================
// STATE CALCULATION
// ============================================================

/**
 * Calcula o estado de uma KR baseado em múltiplos fatores
 * 
 * @example
 * const state = calculateKrState({
 *   progress: 45,
 *   status: 'yellow',
 *   daysSinceCheckin: 7,
 *   cycleEnded: false,
 * });
 * // state === 'at_risk'
 */
export function calculateKrState(params: CalculateKrStateParams): KrState {
  const { 
    progress, 
    status, 
    daysSinceCheckin, 
    cycleEnded, 
    expectedProgress = 0 
  } = params;
  
  // Ciclo encerrado - estados finais
  if (cycleEnded) {
    if (progress > 100) return 'exceeded';
    if (progress >= 100) return 'achieved';
    return 'not_achieved';
  }
  
  // Estados ativos durante o ciclo
  if (progress > 100) return 'exceeded';
  if (progress >= 100) return 'achieved';
  if (progress === 0) return 'not_started';
  if (daysSinceCheckin >= 14) return 'stagnant';
  
  // RAG status crítico
  if (status === 'red') return 'off_track';
  
  // RAG status em atenção ou gap significativo
  if (status === 'yellow' || (expectedProgress > 0 && (expectedProgress - progress) > 15)) {
    return 'at_risk';
  }
  
  return 'healthy';
}

/**
 * Retorna configuração visual e textual para um estado de KR
 */
export function getKrStateConfig(state: KrState): KrStateConfig {
  return KR_STATE_CONFIG[state];
}

/**
 * Agrupa estados por severidade para priorização
 */
export function groupKrStatesBySeverity<T extends { state: KrState }>(
  items: T[]
): Record<KrStateSeverity, T[]> {
  return {
    critical: items.filter(i => KR_STATE_CONFIG[i.state].severity === 'critical'),
    warning: items.filter(i => KR_STATE_CONFIG[i.state].severity === 'warning'),
    info: items.filter(i => KR_STATE_CONFIG[i.state].severity === 'info'),
  };
}

/**
 * Filtra KRs que requerem atenção (não-healthy)
 */
export function filterKrsRequiringAttention<T extends { state: KrState }>(
  items: T[]
): T[] {
  const attentionStates: KrState[] = ['stagnant', 'at_risk', 'off_track', 'not_achieved'];
  return items.filter(i => attentionStates.includes(i.state));
}

/**
 * Filtra KRs para celebração (superadas/atingidas)
 */
export function filterKrsForCelebration<T extends { state: KrState }>(
  items: T[]
): T[] {
  const celebrationStates: KrState[] = ['achieved', 'exceeded'];
  return items.filter(i => celebrationStates.includes(i.state));
}

// ============================================================
// PRIORITY ORDER
// ============================================================

/**
 * Ordem de prioridade para exibição de KRs em wizards
 * Estados críticos primeiro, depois warnings, depois info
 */
export const KR_STATE_PRIORITY_ORDER: KrState[] = [
  'off_track',
  'at_risk',
  'stagnant',
  'not_achieved',
  'exceeded',
  'achieved',
  'healthy',
  'not_started',
];

export function sortByStatePriority<T extends { state: KrState }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const priorityA = KR_STATE_PRIORITY_ORDER.indexOf(a.state);
    const priorityB = KR_STATE_PRIORITY_ORDER.indexOf(b.state);
    return priorityA - priorityB;
  });
}
