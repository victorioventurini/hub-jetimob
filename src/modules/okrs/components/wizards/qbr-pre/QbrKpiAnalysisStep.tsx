/**
 * QbrKpiAnalysisStep - Step 2: Análise de KPIs e Métricas
 *
 * Carrega KPIs do escopo do líder com valor atual, RAG status e variação.
 * (Funcionalidade "Zombie?" removida em 2026-04-28.)
 */

import { memo, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Activity, AlertTriangle, Target, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
import { KpiScopeBadge } from '@/modules/kpis/components/KpiScopeBadge';
import { KpiSparkline } from '@/modules/kpis/components/shared';
import { AreaBadge } from '@/components/ui/area-badge';
import { useBu } from '@/contexts/BuContext';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,

  KpiStatusBlocks,
  useKpiStatusClassification,
  InlineAgendaSuggestionInput,
  JustificationField,
} from '../shared';
import type {
  MbrKpiSnapshot,
  TeamCheckinDecision,
  RitualAgendaSuggestion,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrKpiAnalysisStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  agendaTriggerLabel?: string;
  /**
   * Quando passado, exibe um campo de justificativa obrigatório por KPI em
   * alerta (yellow/red). Usado pelo Pré-MBR (rito reflexivo) — bloqueia o
   * avanço enquanto houver justificativa pendente.
   */
  kpiJustifications?: Record<string, string>;
  onKpiJustificationChange?: (kpiId: string, value: string) => void;
  /** Quando true, bloqueia o "Continuar" se faltar justificativa em algum alerta. */
  requireJustifications?: boolean;
}

// ============================================================
// HELPERS
// ============================================================

const RAG_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  green: { label: 'Na meta', color: 'text-status-green', bg: 'bg-status-green-muted' },
  yellow: { label: 'Atenção', color: 'text-status-amber', bg: 'bg-status-amber-muted' },
  red: { label: 'Crítico', color: 'text-status-red', bg: 'bg-status-red-muted' },
  no_data: { label: 'Sem dados', color: 'text-muted-foreground', bg: 'bg-muted' },
};

// ============================================================
// MEMOIZED CARD (Mandatory React.memo for list cards)
// ============================================================

interface KpiAnalysisCardProps {
  kpi: MbrKpiSnapshot;
  buName?: string | null;
  tone?: 'alert' | 'healthy' | 'muted';
  showJustification?: boolean;
  justificationValue?: string;
  onJustificationChange?: (kpiId: string, value: string) => void;
}

const KpiAnalysisCard = memo(function KpiAnalysisCard({
  kpi,
  buName,
  tone,
  showJustification,
  justificationValue,
  onJustificationChange,
}: KpiAnalysisCardProps) {
  const rag = RAG_STYLES[kpi.ragStatus] || RAG_STYLES.no_data;
  const cardBorder =
    tone === 'healthy'
      ? 'border-status-green/20'
      : tone === 'muted'
        ? 'border-muted'
        : '';

  const handleJustificationChange = useCallback(
    (v: string) => onJustificationChange?.(kpi.kpiId, v),
    [kpi.kpiId, onJustificationChange],
  );

  return (
    <Card className={cardBorder}>
      <CardContent className="p-4 space-y-3">
        {/* Header row: name + badges (left) | meta + value + last date (right) */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <KpiNameLink
              kpiId={kpi.kpiId}
              name={kpi.name}
              className="text-sm font-medium"
            />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">KPI</Badge>
              <Badge variant="secondary" className={cn('text-xs gap-1', rag.bg, rag.color)}>
                {kpi.ragStatus === 'red' || kpi.ragStatus === 'yellow' ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : null}
                {rag.label}
              </Badge>
              {kpi.areaName && (
                <AreaBadge area={{ name: kpi.areaName, color: kpi.areaColor ?? null }} />
              )}
              {kpi.teamName && (
                <Badge variant="outline" className="text-xs whitespace-nowrap gap-1">
                  <Users className="h-3 w-3" />
                  {kpi.teamName}
                </Badge>
              )}
              {kpi.scope && (
                <KpiScopeBadge scope={kpi.scope} buName={buName ?? undefined} />
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            {kpi.target != null && (
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Meta: {kpi.target} {kpi.unit ?? ''}
              </div>
            )}
            {kpi.currentValue != null ? (
              <p className="text-lg font-bold mt-1 leading-tight">
                {kpi.currentValue} {kpi.unit ?? ''}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Sem dados</p>
            )}
            {kpi.lastValueAt && (
              <p className="text-[11px] text-muted-foreground">
                Último: {format(new Date(kpi.lastValueAt), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {kpi.ragStatus !== 'no_data' && (
          <div className="rounded-md border bg-background/40 px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">Evolução recente</span>
              <span className="text-[10px] text-muted-foreground">últimos 12 registros</span>
            </div>
            <KpiSparkline
              kpiId={kpi.kpiId}
              unit={kpi.unit ?? ''}
              target={kpi.target}
              height={64}
              pointsLimit={12}
            />
          </div>
        )}

        {showJustification && onJustificationChange && (
          <JustificationField
            id={`kpi-just-${kpi.kpiId}`}
            label="Justifique o desvio do KPI"
            hint="Obrigatório — explique por que está fora da meta e o plano de ação."
            required
            value={justificationValue ?? ''}
            onChange={handleJustificationChange}
          />
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================
// COMPONENT
// ============================================================

export function QbrKpiAnalysisStep({
  kpiSnapshots,
  onContinue,
  onBack,
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
  kpiJustifications,
  onKpiJustificationChange,
  requireJustifications,
}: QbrKpiAnalysisStepProps) {
  const { currentBu } = useBu();

  const uniqueKpiSnapshots = useMemo(() => {
    const seen = new Set<string>();
    return kpiSnapshots.filter((kpi) => {
      if (seen.has(kpi.kpiId)) return false;
      seen.add(kpi.kpiId);
      return true;
    });
  }, [kpiSnapshots]);

  const { outdated, pending } = useKpiStatusClassification(uniqueKpiSnapshots);
  const statusBlockKpiIds = useMemo(
    () => new Set([...outdated, ...pending].map((kpi) => kpi.kpiId)),
    [outdated, pending],
  );

  const alertKpis = uniqueKpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow');
  const healthyKpis = uniqueKpiSnapshots.filter(
    k => k.ragStatus === 'green' && !statusBlockKpiIds.has(k.kpiId),
  );
  const noDataKpis = uniqueKpiSnapshots.filter(
    k => k.ragStatus === 'no_data' && !statusBlockKpiIds.has(k.kpiId),
  );

  const missingJustifications = requireJustifications
    ? alertKpis.filter((k) => !((kpiJustifications?.[k.kpiId] ?? '').trim())).length
    : 0;

  const handleJustificationChange = useCallback(
    (kpiId: string, value: string) => onKpiJustificationChange?.(kpiId, value),
    [onKpiJustificationChange],
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Activity}
          title="Análise de KPIs"
          tooltip="qbr-kpi-analysis"
          description="Revise a saúde dos indicadores"
          variant="amber"
          badge={`${uniqueKpiSnapshots.length} KPIs`}
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={missingJustifications > 0}
        />
      }
      bottomFixed={
        agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
          <InlineAgendaSuggestionInput
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            sourceStep="qbr-kpi-analysis"
            triggerLabel={agendaTriggerLabel}
          />
        ) : undefined
      }
    >
      <div className="p-6 space-y-6">
        {/* KPIs in alert */}
        {alertKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-amber" />
              KPIs em alerta ({alertKpis.length})
            </h4>
            {alertKpis.map((kpi) => (
              <KpiAnalysisCard
                key={kpi.kpiId}
                kpi={kpi}
                buName={currentBu?.name}
                tone="alert"
                showJustification={requireJustifications}
                justificationValue={kpiJustifications?.[kpi.kpiId]}
                onJustificationChange={handleJustificationChange}
              />
            ))}
          </div>
        )}

        {/* KPIs desatualizados e pendentes */}
        <KpiStatusBlocks kpiSnapshots={uniqueKpiSnapshots} />

        {/* Healthy KPIs */}
        {healthyKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-status-green">
              KPIs na meta ({healthyKpis.length})
            </h4>
            {healthyKpis.map((kpi) => (
              <KpiAnalysisCard key={kpi.kpiId} kpi={kpi} buName={currentBu?.name} tone="healthy" />
            ))}
          </div>
        )}

        {/* No data KPIs */}
        {noDataKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Sem dados ({noDataKpis.length})
            </h4>
            {noDataKpis.map((kpi) => renderKpiCard(kpi, { tone: 'muted' }))}
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
