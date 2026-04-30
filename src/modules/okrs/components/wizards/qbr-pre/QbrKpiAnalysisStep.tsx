/**
 * QbrKpiAnalysisStep - Step 2: Análise de KPIs e Métricas
 *
 * Carrega KPIs do escopo do líder com valor atual, RAG status e variação.
 * (Funcionalidade "Zombie?" removida em 2026-04-28.)
 */

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
} from '../shared';
import type {
  MbrKpiSnapshot,
  TeamCheckinDecision,
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
}: QbrKpiAnalysisStepProps) {
  const alertKpis = kpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow');
  const healthyKpis = kpiSnapshots.filter(k => k.ragStatus === 'green');
  const noDataKpis = kpiSnapshots.filter(k => k.ragStatus === 'no_data');

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Activity}
          title="Análise de KPIs"
          tooltip="qbr-kpi-analysis"
          description="Revise a saúde dos indicadores"
          variant="amber"
          badge={`${kpiSnapshots.length} KPIs`}
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
        />
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
                  <CardContent className="p-3">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* KPIs desatualizados e pendentes */}
        <KpiStatusBlocks kpiSnapshots={kpiSnapshots} />

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
