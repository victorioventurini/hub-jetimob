/**
 * MbrPage — constantes e helpers puros (extraído da página).
 */
import { defaultReferenceMonth } from '@/modules/okrs/utils/mbr/referenceMonth';
import { EMPTY_MBR_PANORAMA_CURATION } from '@/modules/okrs/types/wizard';
import type { MbrStep, MbrDraftData, MbrTeamOkrSnapshot } from '@/modules/okrs/types/wizard';

/**
 * Ordem canônica de análise dos times no MBR (definida por Uriel Canfield em
 * 04/11/2026). Vale para "OKRs dos Times", "Análise por Time", painel de
 * submissões do Panorama e relatório do rito.
 *
 * Times fora desta lista entram no fim, em ordem alfabética. A comparação é
 * normalizada (sem acentos, `&` ≡ `e`, espaços colapsados), então
 * "Gente & Cultura" casa com "Gente e Cultura".
 */
export const TEAM_ANALYSIS_ORDER = [
  'Tecnologia',
  'Produto',
  'Design',
  'BizOps',
  'Customer Success',
  'Marketing',
  'Comercial',
  'Gente e Cultura',
] as const;

const TEAM_ORDER_RANK = new Map(
  TEAM_ANALYSIS_ORDER.map((name, index) => [normalizeTeamName(name), index]),
);

/** Chave de comparação: minúsculas, sem acentos, `&` lido como `e`. */
export function normalizeTeamName(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Posição do time na ordem canônica; fora da lista ⇒ depois de todos. */
export function teamAnalysisRank(name: string | null | undefined): number {
  return TEAM_ORDER_RANK.get(normalizeTeamName(name)) ?? TEAM_ANALYSIS_ORDER.length;
}

/** Compara dois nomes de time pela ordem canônica de análise. */
export function compareTeamNamesByAnalysisOrder(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const rankA = teamAnalysisRank(a);
  const rankB = teamAnalysisRank(b);
  if (rankA !== rankB) return rankA - rankB;
  return normalizeTeamName(a).localeCompare(normalizeTeamName(b), 'pt-BR');
}

/** Ordena snapshots (ou qualquer item com `teamName`) pela ordem canônica. */
export function sortTeamSnapshotsByAnalysisOrder<T extends { teamName: string | null }>(
  teams: readonly T[],
): T[] {
  return [...teams].sort((a, b) =>
    compareTeamNamesByAnalysisOrder(a.teamName, b.teamName),
  );
}

/** `true` quando a lista já está na ordem canônica (evita reescrita no draft). */
export function isTeamSnapshotOrderCanonical(
  teams: readonly { teamId: string; teamName: string | null }[],
): boolean {
  const ordered = sortTeamSnapshotsByAnalysisOrder(teams);
  return ordered.every((team, index) => team.teamId === teams[index]?.teamId);
}

export const WIZARD_STEPS = [
  { id: 'panorama' as const, label: 'Panorama & Curadoria', description: 'Saúde do mês e pauta do MBR' },
  { id: 'kpi-gate' as const, label: 'KPI Gate', description: 'KPIs críticos' },
  { id: 'kpi-deep-dive' as const, label: 'Indicadores fora da meta', description: 'Justificativas e plano dos líderes' },
  { id: 'org-okrs' as const, label: 'OKRs Org', description: 'Prioridades estratégicas' },
  { id: 'team-okrs-overview' as const, label: 'OKRs dos Times', description: 'Visão consolidada' },
  { id: 'team-okrs-detail' as const, label: 'Análise por Time', description: 'Drill-down' },
  { id: 'decisions' as const, label: 'Pautas e decisões', description: 'Consolidação' },
  { id: 'evaluation' as const, label: 'Avaliação do Rito', description: 'Coleta anônima' },
  { id: 'closing' as const, label: 'Encerramento', description: 'Governança' },
];

export const STEP_ORDER: MbrStep[] = [
  'panorama',
  'kpi-gate',
  'kpi-deep-dive',
  'org-okrs',
  'team-okrs-overview',
  'team-okrs-detail',
  'decisions',
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
