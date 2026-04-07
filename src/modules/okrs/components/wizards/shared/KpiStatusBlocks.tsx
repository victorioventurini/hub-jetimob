/**
 * KpiStatusBlocks — Blocos reutilizáveis de KPIs desatualizados e pendentes
 * 
 * Usado em todos os ritos que exibem análise de KPIs:
 * - MBR Panorama, MBR KPI Gate
 * - QBR Pre (KPI Analysis), QBR Pre C-Level
 * - QBR Meeting Opening
 * - Leader Prep (KPI Alert)
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

// ============================================================
// HELPERS
// ============================================================

/** Threshold in days to consider a KPI outdated */
const OUTDATED_THRESHOLD_DAYS = 14;

function isOutdated(lastValueAt: string | null | undefined): boolean {
  if (!lastValueAt) return false;
  const diff = Date.now() - new Date(lastValueAt).getTime();
  return diff > OUTDATED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

function formatDaysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'hoje';
  if (days === 1) return '1 dia atrás';
  return `${days} dias atrás`;
}

function formatValue(value: number | null | undefined, unit?: string): string {
  if (value == null) return '—';
  if (unit === '%') return `${value}%`;
  if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
  return `${value} ${unit || ''}`.trim();
}

// ============================================================
// TYPES
// ============================================================

export interface KpiStatusBlocksProps {
  kpiSnapshots: MbrKpiSnapshot[];
  /** Max KPIs to show per block (default: 5) */
  maxItems?: number;
  /** Only show if there are items */
  hideEmpty?: boolean;
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Classifies KPIs into outdated and pending categories.
 * - Outdated: has a value but lastValueAt is older than threshold
 * - Pending: currentValue is null (never had a value registered)
 */
export function useKpiStatusClassification(kpiSnapshots: MbrKpiSnapshot[]) {
  return useMemo(() => {
    const outdated: MbrKpiSnapshot[] = [];
    const pending: MbrKpiSnapshot[] = [];

    for (const kpi of kpiSnapshots) {
      // Pending: no value ever registered
      if (kpi.currentValue == null && kpi.ragStatus === 'no_data') {
        pending.push(kpi);
        continue;
      }

      // Outdated: has value but last update is stale
      // Don't double-count KPIs already in alert (red/yellow)
      if (kpi.lastValueAt && isOutdated(kpi.lastValueAt) && kpi.ragStatus !== 'red' && kpi.ragStatus !== 'yellow') {
        outdated.push(kpi);
      }
    }

    return { outdated, pending };
  }, [kpiSnapshots]);
}

// ============================================================
// COMPONENTS
// ============================================================

/** Block: KPIs desatualizados */
export function OutdatedKpisBlock({ kpis, maxItems = 5 }: { kpis: MbrKpiSnapshot[]; maxItems?: number }) {
  if (kpis.length === 0) return null;

  return (
    <Card className="border-muted-foreground/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          KPIs Desatualizados ({kpis.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {kpis.slice(0, maxItems).map(kpi => (
          <div key={kpi.kpiId} className="flex items-center justify-between text-xs gap-2">
            <span className="truncate flex-1">{kpi.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              {kpi.lastValueAt && (
                <span className="text-muted-foreground">
                  {formatDaysAgo(kpi.lastValueAt)}
                </span>
              )}
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {formatValue(kpi.currentValue, kpi.unit)}
              </Badge>
            </div>
          </div>
        ))}
        {kpis.length > maxItems && (
          <p className="text-[10px] text-muted-foreground pt-1">
            + {kpis.length - maxItems} outros
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Block: KPIs pendentes (sem dados) */
export function PendingKpisBlock({ kpis, maxItems = 5 }: { kpis: MbrKpiSnapshot[]; maxItems?: number }) {
  if (kpis.length === 0) return null;

  return (
    <Card className="border-dashed border-muted-foreground/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          KPIs Pendentes ({kpis.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {kpis.slice(0, maxItems).map(kpi => (
          <div key={kpi.kpiId} className="flex items-center justify-between text-xs gap-2">
            <span className="truncate flex-1">{kpi.name}</span>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Sem valor
            </Badge>
          </div>
        ))}
        {kpis.length > maxItems && (
          <p className="text-[10px] text-muted-foreground pt-1">
            + {kpis.length - maxItems} outros
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Combined component — renders both blocks below "KPIs em Alerta" */
export function KpiStatusBlocks({ kpiSnapshots, maxItems = 5, hideEmpty = true }: KpiStatusBlocksProps) {
  const { outdated, pending } = useKpiStatusClassification(kpiSnapshots);

  if (hideEmpty && outdated.length === 0 && pending.length === 0) return null;

  return (
    <>
      <OutdatedKpisBlock kpis={outdated} maxItems={maxItems} />
      <PendingKpisBlock kpis={pending} maxItems={maxItems} />
    </>
  );
}
