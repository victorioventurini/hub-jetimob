/**
 * MbrPage — constantes e helpers puros (extraído da página).
 */
import { defaultReferenceMonth } from '@/modules/okrs/utils/mbr/referenceMonth';
import { EMPTY_MBR_PANORAMA_CURATION } from '@/modules/okrs/types/wizard';
import type { MbrStep, MbrDraftData, MbrTeamOkrSnapshot } from '@/modules/okrs/types/wizard';

export const WIZARD_STEPS = [
  { id: 'panorama' as const, label: 'Panorama Executivo', description: 'Saúde do negócio' },
  { id: 'kpi-gate' as const, label: 'KPI Gate', description: 'KPIs críticos' },
  { id: 'team-okrs-overview' as const, label: 'OKRs dos Times', description: 'Visão consolidada' },
  { id: 'team-okrs-detail' as const, label: 'Análise por Time', description: 'Drill-down' },
  { id: 'org-okrs' as const, label: 'OKRs Org', description: 'Prioridades estratégicas' },
  { id: 'decisions' as const, label: 'Decisões', description: 'Consolidação' },
  { id: 'qbr-followup' as const, label: 'Follow-up QBR', description: 'Decisões do QBR' },
  { id: 'evaluation' as const, label: 'Avaliação do Rito', description: 'Coleta anônima' },
  { id: 'closing' as const, label: 'Encerramento', description: 'Governança' },
];

export const STEP_ORDER: MbrStep[] = [
  'panorama',
  'kpi-gate',
  'team-okrs-overview',
  'team-okrs-detail',
  'org-okrs',
  'decisions',
  'qbr-followup',
  'evaluation',
  'closing',
];

export const DEFAULT_DATA: MbrDraftData = {
  // Mês alvo padrão = mês imediatamente anterior (mês fechado).
  referenceMonth: defaultReferenceMonth(),
  kpiSnapshots: [],
  teamOkrSnapshots: [],
  currentTeamIndex: 0,
  orgOkrSnapshots: [],
  decisions: [],
  checklist: {
    strategicFocusClear: false,
    nextStepsHaveOwners: false,
    nonPrioritiesClear: false,
    communicateInAllHands: false,
    kpiGateClear: false,
    allTeamsReviewed: false,
    orgOkrsVerified: false,
    decisionsHaveOwner: false,
    qbrFollowUpAddressed: false,
    nextMbrScheduled: false,
  },
  ritualFeedback: [],
  qbrFollowUpItems: [],
  panoramaCuration: EMPTY_MBR_PANORAMA_CURATION,
};

export function computeHealthScore(objectives: MbrTeamOkrSnapshot['objectives']): number {
  if (objectives.length === 0) return 100;
  const avgProgress = objectives.reduce((s, o) => s + o.progress, 0) / objectives.length;
  const atRiskRatio =
    objectives.reduce((s, o) => s + o.krsAtRisk, 0) /
    Math.max(1, objectives.reduce((s, o) => s + o.krCount, 0));
  return Math.round(Math.max(0, Math.min(100, avgProgress * (1 - atRiskRatio * 0.5))));
}

export function computeHealthStatus(score: number): 'healthy' | 'attention' | 'risk' {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'attention';
  return 'risk';
}
