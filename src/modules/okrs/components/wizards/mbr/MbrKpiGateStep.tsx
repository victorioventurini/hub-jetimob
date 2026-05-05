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
  InlineDecisionInput,
} from '../shared';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { MbrKpiGateTable } from './MbrKpiGateTable';
import { useMbrMonthlyKpisByScope, type MbrMonthlyKpiSnapshot } from '@/modules/okrs/hooks/useMbrMonthlyKpisByScope';
import { formatMonthLabel } from '@/modules/okrs/utils/mbr/referenceMonth';
import { orientedDeltaPct } from '@/modules/okrs/utils/kpiVariations';
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
          <ScopeSection
            title={`KPIs Globais — ${formatMonthLabel(referenceMonth!)}`}
            monthLabel={formatMonthLabel(referenceMonth!)}
            snapshots={orgSnapshots}
            isLoading={overviewLoading}
            emptyMessage="Sem KPIs globais cadastrados nesta BU."
          />
        )}

        {/* ─── KPIs de Área ─── */}
        {overviewEnabled && (
          <ScopeSection
            title={`KPIs de Área — ${formatMonthLabel(referenceMonth!)}`}
            monthLabel={formatMonthLabel(referenceMonth!)}
            snapshots={areaSnapshots}
            isLoading={overviewLoading}
            emptyMessage="Sem KPIs de área cadastrados nesta BU."
          />
        )}

        {/* Cards individuais por KPI removidos — análise por KPI vive no step `kpi-deep-dive`. */}
      </div>
    </WizardStepScaffold>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface ScopeSectionProps {
  title: string;
  monthLabel: string;
  snapshots: MbrMonthlyKpiSnapshot[];
  isLoading: boolean;
  emptyMessage: string;
}

function ScopeSection({ title, monthLabel, snapshots, isLoading, emptyMessage }: ScopeSectionProps) {
  const { gains, drops, noData } = useMemo(() => {
    const gains: MbrMonthlyKpiSnapshot[] = [];
    const drops: MbrMonthlyKpiSnapshot[] = [];
    const noData: MbrMonthlyKpiSnapshot[] = [];

    for (const s of snapshots) {
      if (s.currentValue == null || s.previousValue == null || s.previousValue === 0) {
        noData.push(s);
        continue;
      }
      const rawDelta = ((s.currentValue - s.previousValue) / Math.abs(s.previousValue)) * 100;
      const oriented = orientedDeltaPct(rawDelta, s.direction ?? 'up');
      if (oriented == null || oriented === 0) {
        noData.push(s);
      } else if (oriented > 0) {
        gains.push({ ...s, _oriented: oriented } as MbrMonthlyKpiSnapshot);
      } else {
        drops.push({ ...s, _oriented: oriented } as MbrMonthlyKpiSnapshot);
      }
    }

    gains.sort((a, b) => ((b as any)._oriented ?? 0) - ((a as any)._oriented ?? 0));
    drops.sort((a, b) => ((a as any)._oriented ?? 0) - ((b as any)._oriented ?? 0));

    return { gains, drops, noData };
  }, [snapshots]);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : snapshots.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
      ) : (
        <div className="space-y-5 pl-1">
          <SubGroup
            label="Maiores avanços"
            count={gains.length}
            snapshots={gains}
            monthLabel={monthLabel}
            emptyMessage="Nenhum KPI com avanço no período."
          />
          <SubGroup
            label="Maiores quedas"
            count={drops.length}
            snapshots={drops}
            monthLabel={monthLabel}
            emptyMessage="Nenhum KPI com queda no período."
          />
          <SubGroup
            label="Sem dados"
            count={noData.length}
            snapshots={noData}
            monthLabel={monthLabel}
            emptyMessage="Todos os KPIs têm dados comparáveis."
          />
        </div>
      )}

      <div className="border-t border-border" />
    </section>
  );
}

interface SubGroupProps {
  label: string;
  count: number;
  snapshots: MbrMonthlyKpiSnapshot[];
  monthLabel: string;
  emptyMessage: string;
}

function SubGroup({ label, count, snapshots, monthLabel, emptyMessage }: SubGroupProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label} <span className="text-muted-foreground/70 normal-case">({count})</span>
      </h4>
      {snapshots.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
      ) : (
        <MbrKpiGateTable snapshots={snapshots} monthLabel={monthLabel} />
      )}
    </div>
  );
}
