/**
 * MbrPanoramaStep - Etapa 1: Panorama Executivo
 * 
 * Visão consolidada da saúde do negócio via KPIs mestres.
 * KPIs em risco (amarelo/vermelho) destacados no topo.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardFirstStepFooter, InlineDecisionInput, LastCheckinBadge } from '../shared';
import type { MbrKpiSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrPanoramaStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  onKpiSnapshotsChange: (snapshots: MbrKpiSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  lastCompletedAt?: string | null;
  onContinue: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function ragBadgeClass(rag: string) {
  switch (rag) {
    case 'green': return 'bg-status-green-muted text-status-green';
    case 'yellow': return 'bg-status-yellow-muted text-status-yellow';
    case 'red': return 'bg-status-red-muted text-status-red';
    default: return 'bg-muted text-muted-foreground';
  }
}

function TrendIcon({ value }: { value: number | null }) {
  if (!value || value === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (value > 0) return <TrendingUp className="h-3.5 w-3.5 text-status-green" />;
  return <TrendingDown className="h-3.5 w-3.5 text-status-red" />;
}

function formatVariation(value: number | null) {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrPanoramaStep({
  kpiSnapshots,
  onKpiSnapshotsChange,
  decisions,
  onDecisionsChange,
  lastCompletedAt,
  onContinue,
}: MbrPanoramaStepProps) {
  // Sort: at-risk (red, yellow) first
  const sortedKpis = useMemo(() => {
    const priority: Record<string, number> = { red: 0, yellow: 1, green: 2 };
    return [...kpiSnapshots].sort(
      (a, b) => (priority[a.ragStatus] ?? 3) - (priority[b.ragStatus] ?? 3)
    );
  }, [kpiSnapshots]);

  const atRiskCount = kpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow').length;

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={BarChart3}
        title="Panorama Executivo"
        description="Saúde consolidada do negócio"
        variant="primary"
        rightContent={
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary">{kpiSnapshots.length} KPIs</Badge>
            <LastCheckinBadge lastCompletedAt={lastCompletedAt ?? null} />
          </div>
        }
      />

      {/* Summary bar */}
      {atRiskCount > 0 && (
        <div className="px-6 py-3 border-b bg-status-amber/5">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-status-amber" />
            <span className="font-medium">{atRiskCount} KPI{atRiskCount !== 1 ? 's' : ''} em atenção</span>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="flex-1 overflow-y-auto p-6">
        {sortedKpis.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum KPI organizacional carregado. Os snapshots serão preenchidos conforme a integração.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedKpis.map((kpi) => (
              <Card key={kpi.kpiId} className={cn(
                'transition-colors',
                kpi.ragStatus === 'red' && 'border-status-red/30',
                kpi.ragStatus === 'yellow' && 'border-status-amber/30',
              )}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate flex-1">{kpi.name}</p>
                    <Badge variant="secondary" className={cn('text-xs ml-2', ragBadgeClass(kpi.ragStatus))}>
                      {kpi.ragStatus === 'green' ? 'OK' : kpi.ragStatus === 'yellow' ? 'Atenção' : 'Crítico'}
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">{kpi.currentValue ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        Meta: {kpi.target ?? '—'}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1 justify-end">
                        <TrendIcon value={kpi.variationVsLastMonth} />
                        <span className="text-xs">{formatVariation(kpi.variationVsLastMonth)} vs mês ant.</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-muted-foreground">
                          {formatVariation(kpi.variationVsTarget)} vs meta
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Inline decisions */}
      <div className="border-t">
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="panorama"
          placeholder="Nota ou decisão sobre o panorama geral..."
        />
      </div>

      <WizardFirstStepFooter
        primaryLabel="Analisar KPIs Críticos"
        onPrimary={onContinue}
      />
    </div>
  );
}
