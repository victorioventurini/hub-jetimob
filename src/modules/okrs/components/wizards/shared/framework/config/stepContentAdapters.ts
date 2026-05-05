/**
 * Step Content Adapters — tradutores entre contexto específico e formato genérico.
 *
 * Cada componente do framework consome um formato padronizado. Os adapters
 * vivem aqui como funções puras: recebem o estado completo do rito (ex:
 * `MbrDraftData`, `LeaderPrepDraftData`) e produzem o shape esperado
 * pelo componente genérico.
 *
 * Não importar nada de UI aqui. Apenas data → data.
 */

import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type {
  KpiForWizardV2,
  KpiInputType,
  KpiFrequencyValue,
} from '@/modules/kpis/types';
import { FREQUENCY_DAYS, legacyFrequencyToValue } from '@/modules/kpis/utils/frequency';

// ============================================================
// SHARED SHAPES (contratos consumidos pelo framework)
// ============================================================

export interface BalanceContent {
  /** Texto narrativo do balanço (markdown leve) */
  narrative: string;
  /** Indicadores resumidos exibidos como chips (opcional) */
  highlights?: Array<{ id: string; label: string; value?: string }>;
}

export interface KpiGateItem {
  id: string;
  name: string;
  status: 'green' | 'amber' | 'red' | 'unknown';
  currentValue?: string;
  target?: string;
  /** Quando true, o KPI está em alerta e precisa de decisão para liberar gate */
  requiresDecision: boolean;
  resolved?: boolean;
  // v3.0.0 — metadados opcionais usados nas badges do KPI Gate
  lastInputType?: KpiInputType | null;
  updateFrequency?: KpiFrequencyValue | null;
  deviationPct?: number | null;
  // Metadados extras consumidos pelo `cardVariant: 'rich'` do KpiGateStep
  /** Unidade canônica para `formatValueWithUnit` e sparkline */
  unit?: string;
  /** Data ISO do último valor (para badge "Último: dd/MM/yyyy") */
  latestReferenceDate?: string | null;
  /** Escopo do KPI ('global'/'area'/'team'/'individual') */
  scope?: string | null;
  /** v3.35.0 — Área efetiva (estrutural com fallback operacional) para AreaBadge. */
  areaName?: string | null;
  areaColor?: string | null;
  /** v3.35.0 — Time responsável (operacional) para badge de time. */
  teamName?: string | null;
}

/**
 * v3.0.0 — Buckets ordenados (6 grupos) usados pelo KpiGateStep para
 * apresentar KPIs em ordem de prioridade decrescente. `teamContext`
 * é colapsado por default no UI.
 */
export type KpiGateBucketId =
  | 'overdue'
  | 'critical'
  | 'guardrailViolated'
  | 'attention'
  | 'healthy'
  | 'teamContext';

export interface KpiGateBucket {
  id: KpiGateBucketId;
  label: string;
  description?: string;
  items: KpiGateItem[];
}

export interface KrsItem {
  id: string;
  title: string;
  objectiveTitle?: string;
  status: 'on-track' | 'at-risk' | 'blocked' | 'completed' | 'stagnant' | 'unknown';
  progress: number;
  ownerName?: string | null;
  attentionReason?: string;
  reviewed?: boolean;
  /**
   * Ação do líder marcada para a pauta (apenas em mode='leader-actions').
   * `discuss_group` = discutir em grupo. `followup_1on1` = follow-up 1:1.
   */
  leaderAction?: 'discuss_group' | 'followup_1on1' | null;
  /** Dias desde o último check-in (para badges de pendência). */
  daysSinceCheckin?: number;
  /** Marca o KR como em risco para destaque visual. */
  isAtRisk?: boolean;
  /** Marca o KR como pendente (sem check-in recente). */
  isPending?: boolean;
}

/**
 * Item de insight gerado pelo sistema/IA — consumido por LeaderInsightsStep.
 * Tipos refletem os HIGHLIGHT_CARD_STYLES centralizados.
 */
export interface LeaderInsightItem {
  id: string;
  type: 'stagnant' | 'blocked' | 'initiative_impact' | 'help_requested' | 'overdue';
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  source: 'system' | 'ai';
  relatedKrId?: string;
  /** Quando true e source='ai', permite descartar via botão. */
  dismissable?: boolean;
}

/**
 * Container do LeaderInsightsStep: insights + lista de IDs descartados.
 */
export interface LeaderInsightsData {
  insights: LeaderInsightItem[];
  dismissedIds: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  status: 'on-track' | 'at-risk' | 'blocked' | 'done' | 'unknown';
  health?: 'green' | 'amber' | 'red';
  ownerName?: string | null;
  teamCount?: number;
}

export interface InitiativeItem {
  id: string;
  title: string;
  status: 'planned' | 'in-progress' | 'done' | 'blocked' | 'unknown';
  ownerName?: string | null;
  linkedKrTitle?: string | null;
}

export interface HighlightItem {
  id: string;
  type: 'accelerated' | 'blocked' | 'attention' | 'worked' | 'didnt-work' | 'debt';
  title: string;
  description?: string;
  relatedId?: string;
}

// ============================================================
// DECISIONS — agrupamento por sourceStep
// ============================================================

export interface DecisionsBySourceStep {
  sourceStep: string;
  count: number;
  decisions: TeamCheckinDecision[];
}

/**
 * Agrupa decisões pelo `sourceStep` para renderização consolidada
 * no `DecisionsStep`. Decisões sem `sourceStep` definido vão para
 * o bucket `__unsourced__`.
 */
export function groupDecisionsBySourceStep(
  decisions: TeamCheckinDecision[],
): DecisionsBySourceStep[] {
  const buckets = new Map<string, TeamCheckinDecision[]>();
  for (const d of decisions) {
    const key = d.sourceStep ?? '__unsourced__';
    const arr = buckets.get(key);
    if (arr) arr.push(d);
    else buckets.set(key, [d]);
  }
  return Array.from(buckets.entries()).map(([sourceStep, list]) => ({
    sourceStep,
    count: list.length,
    decisions: list,
  }));
}

// ============================================================
// KPI GATE — classificação 6-blocos + ordenação
// ============================================================

/**
 * Adapta um `KpiForWizardV2` para `KpiGateItem` preservando os
 * metadados v3.0.0 (input_type, update_frequency, deviation_pct).
 */
export function kpiForWizardV2ToGateItem(
  kpi: KpiForWizardV2,
  opts: { requiresDecision?: boolean; resolvedIds?: Set<string> } = {},
): KpiGateItem {
  const status: KpiGateItem['status'] =
    kpi.latest_rag_status === 'on_track'
      ? 'green'
      : kpi.latest_rag_status === 'at_risk'
      ? 'amber'
      : kpi.latest_rag_status === 'off_track'
      ? 'red'
      : 'unknown';
  return {
    id: kpi.id,
    name: kpi.name,
    status,
    currentValue: kpi.latest_value != null ? String(kpi.latest_value) : undefined,
    target: kpi.target_value != null ? String(kpi.target_value) : undefined,
    requiresDecision: opts.requiresDecision ?? (status === 'red' || status === 'amber'),
    resolved: opts.resolvedIds?.has(kpi.id) ?? false,
    lastInputType: kpi.latest_input_type,
    updateFrequency: kpi.update_frequency,
    deviationPct: kpi.deviation_pct,
    unit: kpi.unit,
    latestReferenceDate: kpi.latest_reference_date,
    scope: kpi.scope,
    areaName: kpi.effective_area?.name ?? null,
    areaColor: kpi.effective_area?.color ?? null,
    teamName: kpi.effective_team?.name ?? null,
  };
}

/**
 * Comparator: por update_frequency (mais frequente primeiro), depois por
 * `|deviation_pct|` decrescente (maior desvio primeiro). KPIs sem frequência
 * vão para o final; sem deviation, considera 0.
 */
export function byUpdateFrequencyThenDeviation(a: KpiGateItem, b: KpiGateItem): number {
  const freqDays = (item: KpiGateItem): number => {
    const f = item.updateFrequency;
    if (!f) return Number.POSITIVE_INFINITY;
    return FREQUENCY_DAYS[f] ?? Number.POSITIVE_INFINITY;
  };
  const da = freqDays(a);
  const db = freqDays(b);
  if (da !== db) return da - db;
  const ad = Math.abs(a.deviationPct ?? 0);
  const bd = Math.abs(b.deviationPct ?? 0);
  return bd - ad;
}

const BUCKET_LABELS: Record<KpiGateBucketId, { label: string; description?: string }> = {
  overdue: { label: 'Atrasados', description: 'Sem atualização dentro da cadência esperada' },
  critical: { label: 'Críticos', description: 'Em alerta e fora da meta (off-track)' },
  guardrailViolated: { label: 'Guardrails violados', description: 'Guardrails de KRs em risco' },
  attention: { label: 'Atenção', description: 'Em alerta com risco moderado (at-risk)' },
  healthy: { label: 'Saudáveis (estratégicos)', description: 'On-track' },
  teamContext: { label: 'Contexto do time', description: 'Read-only (colapsado)' },
};

export interface ClassifyKpiGateInput {
  kpisToUpdate: KpiForWizardV2[];
  kpisInAlert: KpiForWizardV2[];
  kpisStrategic: KpiForWizardV2[];
  kpisTeamContext: KpiForWizardV2[];
  guardrailsViolated: KpiForWizardV2[];
  resolvedIds?: Set<string>;
}

/**
 * Classifica os KPIs em 6 buckets ordenados (Fase 6 — refator de
 * frequência). Cada KPI aparece em apenas um bucket; a
 * precedência segue a ordem dos blocos (overdue > critical > guardrail
 * > attention > healthy > teamContext).
 *
 * Ordenação intra-bloco: `byUpdateFrequencyThenDeviation`.
 */
export function classifyKpiGateBuckets(input: ClassifyKpiGateInput): KpiGateBucket[] {
  const seen = new Set<string>();
  const resolvedIds = input.resolvedIds ?? new Set<string>();

  const take = (
    list: KpiForWizardV2[],
    predicate: (k: KpiForWizardV2) => boolean,
    requiresDecision?: boolean,
  ): KpiGateItem[] => {
    const items: KpiGateItem[] = [];
    for (const k of list) {
      if (seen.has(k.id)) continue;
      if (!predicate(k)) continue;
      seen.add(k.id);
      items.push(kpiForWizardV2ToGateItem(k, { requiresDecision, resolvedIds }));
    }
    return items.sort(byUpdateFrequencyThenDeviation);
  };

  // 1. Overdue (precisam atualização)
  const overdue = take(input.kpisToUpdate, () => true, true);
  // 2. Críticos = inAlert ∩ off_track (já excluindo overdue por `seen`)
  const critical = take(
    input.kpisInAlert,
    (k) => k.latest_rag_status === 'off_track',
    true,
  );
  // 3. Guardrails violados
  const guardrailViolated = take(input.guardrailsViolated, () => true, true);
  // 4. Atenção = inAlert ∩ at_risk
  const attention = take(
    input.kpisInAlert,
    (k) => k.latest_rag_status === 'at_risk',
    true,
  );
  // 5. Saudáveis (estratégicos on_track)
  const healthy = take(
    input.kpisStrategic,
    (k) => k.latest_rag_status === 'on_track',
    false,
  );
  // 6. Contexto do time
  const teamContext = take(input.kpisTeamContext, () => true, false);

  return [
    { id: 'overdue', items: overdue, ...BUCKET_LABELS.overdue },
    { id: 'critical', items: critical, ...BUCKET_LABELS.critical },
    { id: 'guardrailViolated', items: guardrailViolated, ...BUCKET_LABELS.guardrailViolated },
    { id: 'attention', items: attention, ...BUCKET_LABELS.attention },
    { id: 'healthy', items: healthy, ...BUCKET_LABELS.healthy },
    { id: 'teamContext', items: teamContext, ...BUCKET_LABELS.teamContext },
  ];
}

// ============================================================
// KPI GATE — classificação a partir de snapshots MENSAIS (Pré-MBR)
// ============================================================

/**
 * Snapshot mensal de KPI (subset estrutural de `MbrKpiSnapshot`) usado pela
 * variante mensal do classificador. Mantemos o tipo aqui em formato anêmico
 * para evitar acoplamento com `@/modules/okrs/types/wizard`.
 */
export interface MonthlyKpiSnapshotForGate {
  kpiId: string;
  name: string;
  currentValue: number | null;
  previousValue?: number | null;
  target: number | null;
  ragStatus: string; // 'green' | 'yellow' | 'red' | 'no_data'
  unit?: string | null;
  lastValueAt?: string | null;
  scope?: string | null;
  latestInputType?: 'partial' | 'consolidated' | null;
  /** v3.35.0 — área efetiva para badge */
  areaName?: string | null;
  areaColor?: string | null;
  /** v3.35.0 — time responsável (operacional) */
  teamName?: string | null;
}

function snapshotStatus(s: MonthlyKpiSnapshotForGate): KpiGateItem['status'] {
  switch (s.ragStatus) {
    case 'green': return 'green';
    case 'yellow': return 'amber';
    case 'red': return 'red';
    default: return 'unknown';
  }
}

function snapshotToGateItem(
  s: MonthlyKpiSnapshotForGate,
  requiresDecision: boolean,
): KpiGateItem {
  return {
    id: s.kpiId,
    name: s.name,
    status: snapshotStatus(s),
    currentValue: s.currentValue != null ? String(s.currentValue) : undefined,
    target: s.target != null ? String(s.target) : undefined,
    requiresDecision,
    resolved: false,
    lastInputType: s.latestInputType ?? null,
    updateFrequency: null,
    deviationPct: null,
    unit: s.unit ?? undefined,
    latestReferenceDate: s.lastValueAt ?? null,
    scope: s.scope ?? null,
    areaName: s.areaName ?? null,
    areaColor: s.areaColor ?? null,
    teamName: s.teamName ?? null,
  };
}

/**
 * Classifica KPIs em buckets canônicos usando snapshots **ancorados no mês
 * de referência** do Pré-MBR. Diferente de `classifyKpiGateBuckets`, esta
 * variante:
 *   - Não usa `kpisToUpdate`/`kpisInAlert` do estado atual.
 *   - Bucket `overdue` = sem valor consolidado dentro do mês de referência
 *     (`currentValue == null` OU `latestInputType === 'partial'`).
 *   - Sem `guardrailViolated` (não há sinal mensal canônico).
 *   - Sem `teamContext` (escopo já filtrado pelo hook do time).
 */
export function classifyKpiGateBucketsFromMonthlySnapshots(
  snapshots: MonthlyKpiSnapshotForGate[],
): KpiGateBucket[] {
  const overdue: KpiGateItem[] = [];
  const critical: KpiGateItem[] = [];
  const attention: KpiGateItem[] = [];
  const healthy: KpiGateItem[] = [];

  for (const s of snapshots) {
    const noConsolidated = s.currentValue == null || s.latestInputType === 'partial' || s.ragStatus === 'no_data';
    if (noConsolidated) {
      overdue.push(snapshotToGateItem(s, true));
      continue;
    }
    if (s.ragStatus === 'red') {
      critical.push(snapshotToGateItem(s, true));
      continue;
    }
    if (s.ragStatus === 'yellow') {
      attention.push(snapshotToGateItem(s, true));
      continue;
    }
    healthy.push(snapshotToGateItem(s, false));
  }

  return [
    { id: 'overdue', items: overdue, ...BUCKET_LABELS.overdue },
    { id: 'critical', items: critical, ...BUCKET_LABELS.critical },
    { id: 'guardrailViolated', items: [], ...BUCKET_LABELS.guardrailViolated },
    { id: 'attention', items: attention, ...BUCKET_LABELS.attention },
    { id: 'healthy', items: healthy, ...BUCKET_LABELS.healthy },
    { id: 'teamContext', items: [], ...BUCKET_LABELS.teamContext },
  ];
}

// Garantir referência ao helper legacy (utilitário disponível para callers
// que ainda precisem mapear a frequência antiga para `KpiFrequencyValue`).
export { legacyFrequencyToValue };
