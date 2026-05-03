/**
 * QbrKpiAnalysisStep - Step 2: Análise de KPIs e Métricas
 *
 * Carrega KPIs do escopo do líder com valor atual, RAG status e variação.
 * (Funcionalidade "Zombie?" removida em 2026-04-28.)
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Activity, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
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
            {alertKpis.map((kpi) => {
              const rag = RAG_STYLES[kpi.ragStatus] || RAG_STYLES.no_data;
              return (
                <Card key={kpi.kpiId}>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <KpiNameLink kpiId={kpi.kpiId} name={kpi.name} className="text-sm font-medium" />
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={cn('text-xs', rag.color)}>
                            {rag.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Atual: {kpi.currentValue != null ? kpi.currentValue : '—'} {kpi.unit}
                          </span>
                          {kpi.target != null && (
                            <span className="text-xs text-muted-foreground">
                              Meta: {kpi.target} {kpi.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {requireJustifications && onKpiJustificationChange && (
                      <JustificationField
                        id={`kpi-just-${kpi.kpiId}`}
                        label="Justifique o desvio do KPI"
                        hint="Obrigatório — explique por que está fora da meta e o plano de ação."
                        required
                        value={kpiJustifications?.[kpi.kpiId] ?? ''}
                        onChange={(v) => onKpiJustificationChange(kpi.kpiId, v)}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
              <Card key={kpi.kpiId} className="border-status-green/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <KpiNameLink kpiId={kpi.kpiId} name={kpi.name} className="text-sm" />
                      <span className="text-xs text-muted-foreground">
                        {kpi.currentValue != null ? kpi.currentValue : '—'}{kpi.target != null ? ` / ${kpi.target}` : ''} {kpi.unit}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No data KPIs */}
        {noDataKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Sem dados ({noDataKpis.length})
            </h4>
            {noDataKpis.map((kpi) => (
              <Card key={kpi.kpiId} className="border-muted">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <KpiNameLink kpiId={kpi.kpiId} name={kpi.name} className="text-sm" />
                      <span className="text-xs text-muted-foreground">
                        Nenhum valor registrado
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
