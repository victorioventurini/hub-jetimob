/**
 * QbrKpiAnalysisStep - Step 2: Análise de KPIs e Métricas
 * 
 * Carrega KPIs do escopo do líder com valor atual, RAG status e variação.
 * Permite marcar KPIs como "zombie".
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Activity, AlertTriangle, Ghost,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
  KpiStatusBlocks,
} from '../shared';
import type {
  MbrKpiSnapshot,
  QbrPreDraftData,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrKpiAnalysisStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  zombieCandidates: string[];
  onZombieCandidatesChange: (ids: string[]) => void;
  /** @deprecated KPI suggestions removed — kept for backward compat */
  kpisToCreate?: QbrPreDraftData['kpisToCreate'];
  /** @deprecated KPI suggestions removed — kept for backward compat */
  onKpisToCreateChange?: (kpis: QbrPreDraftData['kpisToCreate']) => void;
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
  zombieCandidates,
  onZombieCandidatesChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: QbrKpiAnalysisStepProps) {
  const handleToggleZombie = (kpiId: string) => {
    if (zombieCandidates.includes(kpiId)) {
      onZombieCandidatesChange(zombieCandidates.filter(id => id !== kpiId));
    } else {
      onZombieCandidatesChange([...zombieCandidates, kpiId]);
    }
  };

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
          description="Revise a saúde dos indicadores e sinalize oportunidades"
          variant="amber"
          badge={`${kpiSnapshots.length} KPIs`}
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="qbr-kpi-analysis"
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
              const isZombie = zombieCandidates.includes(kpi.kpiId);
              return (
                <Card key={kpi.kpiId} className={cn(isZombie && 'border-dashed opacity-60')}>
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
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          id={`zombie-${kpi.kpiId}`}
                          checked={isZombie}
                          onCheckedChange={() => handleToggleZombie(kpi.kpiId)}
                        />
                        <Label htmlFor={`zombie-${kpi.kpiId}`} className="text-xs cursor-pointer flex items-center gap-1">
                          <Ghost className="h-3 w-3" />
                          Zombie?
                        </Label>
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
            {healthyKpis.map((kpi) => {
              const isZombie = zombieCandidates.includes(kpi.kpiId);
              return (
                <Card key={kpi.kpiId} className={cn('border-status-green/20', isZombie && 'border-dashed opacity-60')}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{kpi.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {kpi.currentValue != null ? kpi.currentValue : '—'}{kpi.target != null ? ` / ${kpi.target}` : ''} {kpi.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          id={`zombie-healthy-${kpi.kpiId}`}
                          checked={isZombie}
                          onCheckedChange={() => handleToggleZombie(kpi.kpiId)}
                        />
                        <Label htmlFor={`zombie-healthy-${kpi.kpiId}`} className="text-xs cursor-pointer">
                          <Ghost className="h-3 w-3" />
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* No data KPIs */}
        {noDataKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Sem dados ({noDataKpis.length})
            </h4>
            {noDataKpis.map((kpi) => {
              const isZombie = zombieCandidates.includes(kpi.kpiId);
              return (
                <Card key={kpi.kpiId} className={cn('border-muted', isZombie && 'border-dashed opacity-60')}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{kpi.name}</p>
                        <span className="text-xs text-muted-foreground">
                          Nenhum valor registrado
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          id={`zombie-nodata-${kpi.kpiId}`}
                          checked={isZombie}
                          onCheckedChange={() => handleToggleZombie(kpi.kpiId)}
                        />
                        <Label htmlFor={`zombie-nodata-${kpi.kpiId}`} className="text-xs cursor-pointer">
                          <Ghost className="h-3 w-3" />
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}


        {/* Zombie summary */}
        {zombieCandidates.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Ghost className="h-3.5 w-3.5" />
              {zombieCandidates.length} KPI{zombieCandidates.length > 1 ? 's' : ''} marcado{zombieCandidates.length > 1 ? 's' : ''} como potencialmente zombie — serão discutidos no QBR.
            </p>
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
