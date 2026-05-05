/**
 * MbrKpiGateStep - Etapa 2: KPI Gate Estratégico (MBR Executivo)
 *
 * Exibe apenas KPIs amarelos/vermelhos.
 * Gate: não permite avançar se algum KPI marcado como "exige decisão" não tem decisão registrada.
 *
 * @deprecated Para uso APENAS no MBR Executivo. Demais ritos (mbr-pre, qbr-pre)
 * devem consumir o `KpiGateStep` canônico do framework
 * (`@/wizards-framework`) com `config.cardVariant: 'rich'`.
 * Ver TCR §4.8.1 (Princípio #4 — variação por config) e
 * `mem://architecture/wizards/wizards-master-standard`.
 */

import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  KpiMonthlyComparisonCard,
  InlineDecisionInput,
} from '../shared';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { useMbrMonthlyKpisByScope } from '@/modules/okrs/hooks/useMbrMonthlyKpisByScope';
import { formatMonthLabel } from '@/modules/okrs/utils/mbr/referenceMonth';
import type { MbrKpiSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
// ============================================================
// TYPES
// ============================================================

export interface MbrKpiGateStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  onKpiSnapshotsChange: (snapshots: MbrKpiSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** Mapa teamId → nome para exibir origem das sinalizações */
  teamNamesById?: Record<string, string>;
  /** KPIs propostos pelos líderes no MBR-PRE */
  proposedKpis?: Array<{
    teamId: string;
    description: string;
    suggestedScope?: string;
    relatedKrTitle?: string;
    submittedByName?: string;
  }>;
  onContinue: () => void;
  onBack: () => void;
  /**
   * Quando `false`, oculta o toggle "Exige decisão estratégica?" e trata
   * `requiresStrategicDecision` como derivado do bucket canônico (read-only).
   * Default: `true` (preserva comportamento do MBR executivo).
   */
  showStrategicDecisionToggle?: boolean;
  /**
   * Quando `true`, o gate exige ≥1 decisão por KPI obrigatório (matching por
   * `metadata.kpi_id`), em vez de uma contagem agregada de decisões em
   * `sourceStep='kpi-gate'`. Mensagem de pendência lista os KPIs faltantes.
   * Default: `false`.
   */
  requirePlanForCriticalKpis?: boolean;
  /**
   * Quando `false`, oculta o `InlineDecisionInput` dentro de cada KPI.
   * Útil para fluxos (ex: MBR-Pré) que delegam o registro de plano a outro
   * step e querem manter o card apenas como leitura/justificativa.
   * Default: `true` (preserva MBR executivo).
   */
  showInlineDecisionInput?: boolean;
  /**
   * Mês de referência (`YYYY-MM`) para o overview comparativo de KPIs
   * globais e de área. Obrigatório quando `showMonthlyOverview = true`.
   */
  referenceMonth?: string | null;
  /**
   * Quando `true`, renderiza acima dos KPIs em atenção um overview
   * comparativo (mês de referência vs anterior) dos KPIs `org` e `area`,
   * agrupados por área e/ou time. Default: `false`.
   */
  showMonthlyOverview?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrKpiGateStep({
  kpiSnapshots,
  onKpiSnapshotsChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
  showStrategicDecisionToggle = true,
  requirePlanForCriticalKpis = false,
  showInlineDecisionInput = true,
  referenceMonth = null,
  showMonthlyOverview = false,
}: MbrKpiGateStepProps) {
  // Overview mensal comparativo (KPIs globais + de área).
  const overviewEnabled = !!showMonthlyOverview && !!referenceMonth;
  const { snapshots: overviewSnapshots, isLoading: overviewLoading } =
    useMbrMonthlyKpisByScope(overviewEnabled ? referenceMonth : null, ['org', 'area']);

  const orgSnapshots = useMemo(
    () => overviewSnapshots.filter(s => s.scope === 'org'),
    [overviewSnapshots]
  );
  const areaSnapshots = useMemo(
    () => overviewSnapshots.filter(s => s.scope === 'area'),
    [overviewSnapshots]
  );

  const criticalKpis = useMemo(
    () => kpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow'),
    [kpiSnapshots]
  );

  const mandatoryKpis = useMemo(
    () => criticalKpis.filter(k => k.requiresStrategicDecision),
    [criticalKpis]
  );

  // Mapa kpi_id → tem decisão registrada (texto não vazio)
  const decisionByKpiId = useMemo(() => {
    const set = new Set<string>();
    for (const d of decisions) {
      if (d.sourceStep !== 'kpi-gate') continue;
      if (!d.text || d.text.trim().length === 0) continue;
      const kpiId = (d.metadata as { kpi_id?: string } | undefined)?.kpi_id;
      if (kpiId) set.add(kpiId);
    }
    return set;
  }, [decisions]);

  // Gate por-KPI (novo): cada KPI obrigatório precisa de plano com kpi_id matching.
  const missingKpis = useMemo(
    () => (requirePlanForCriticalKpis
      ? mandatoryKpis.filter(k => !decisionByKpiId.has(k.kpiId))
      : []),
    [requirePlanForCriticalKpis, mandatoryKpis, decisionByKpiId]
  );

  // Gate agregado (legado): conta decisões totais com sourceStep='kpi-gate'.
  const kpiGateDecisionsCount = useMemo(
    () => decisions.filter(d => d.sourceStep === 'kpi-gate' && d.text.trim().length > 0).length,
    [decisions]
  );
  const aggregateMissing = Math.max(0, mandatoryKpis.length - kpiGateDecisionsCount);

  const canProceed = requirePlanForCriticalKpis
    ? missingKpis.length === 0
    : aggregateMissing === 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ShieldAlert}
          title="KPI Gate Estratégico"
        tooltip="mbr-kpi-gate"
          description={`${criticalKpis.length} KPI${criticalKpis.length !== 1 ? 's' : ''} em atenção`}
          variant="amber"
        />
      }
      bottomFixed={
        <>
          {!canProceed && (
            <p className="text-xs text-status-amber text-center pb-2 px-4">
              {requirePlanForCriticalKpis
                ? `Registre um plano para: ${missingKpis.map(k => k.name).join(', ')}`
                : `Registre decisões (faltam ${aggregateMissing}) para continuar`}
            </p>
          )}
          <div className="border-t bg-card/50 backdrop-blur-sm">
            <InlineDecisionInput
              decisions={decisions}
              onDecisionsChange={onDecisionsChange}
              sourceStep="kpi-gate"
            />
          </div>
        </>
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Avançar para Indicadores fora da meta"
          primaryDisabled={!canProceed}
        />
      }
    >
      <div className="p-6 space-y-6 min-w-0 max-w-full">
        {/* ─── KPIs Globais ─── */}
        {overviewEnabled && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                KPIs Globais — {formatMonthLabel(referenceMonth!)}
              </h3>
            </div>
            {overviewLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : orgSnapshots.length > 0 ? (
              <KpiMonthlyComparisonCard
                snapshots={orgSnapshots}
                title="Visão consolidada do mês"
                showNoData
                stack
                topN={5}
                emptyMessage="Sem dados comparáveis no período."
              />
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Sem KPIs globais cadastrados nesta BU.
              </p>
            )}
            <div className="border-t border-border" />
          </section>
        )}

        {/* ─── KPIs de Área ─── */}
        {overviewEnabled && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                KPIs de Área — {formatMonthLabel(referenceMonth!)}
              </h3>
            </div>
            {overviewLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : areaSnapshots.length > 0 ? (
              <KpiMonthlyComparisonCard
                snapshots={areaSnapshots}
                title="Visão consolidada do mês"
                showNoData
                stack
                topN={5}
                emptyMessage="Sem dados comparáveis no período."
              />
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Sem KPIs de área cadastrados nesta BU.
              </p>
            )}
            <div className="border-t border-border" />
          </section>
        )}

        {/* Cards individuais por KPI removidos — análise por KPI vive no step `kpi-deep-dive`. */}
      </div>
    </WizardStepScaffold>
  );
}
