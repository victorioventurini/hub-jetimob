/**
 * KpiMonthlyComparisonCard — Card compartilhado "Comparativo vs mês anterior".
 *
 * Renderiza Maiores avanços / Maiores quedas a partir de um conjunto de
 * `MbrKpiSnapshot` já ancorado em um mês de referência (usar
 * `useMbrPreTeamKpisMonthly` ou `useMbrMonthlyKpisByScope`).
 *
 * SSOT visual da seção — usado pelo Pré-MBR (Abertura) e pelo MBR Executivo
 * (KPI Gate Overview).
 */

import { memo, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, MinusCircle } from 'lucide-react';
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MbrKpiSnapshot } from '@/modules/okrs/types/wizard';
import {
  classifyKpiDelta,
  orientedDeltaPct,
} from '@/modules/okrs/utils/kpiVariations';

// ============================================================
// HELPERS (canônicos — antes duplicados em MbrPreOpeningStep)
// ============================================================

export function formatKpiValue(
  value: number | null | undefined,
  unit?: string,
): string {
  if (value == null) return '—';
  const formatted = Math.abs(value) >= 1000
    ? value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (!unit) return formatted;
  if (unit === '%') return `${formatted}%`;
  if (unit === 'R$') return `R$ ${formatted}`;
  return `${formatted} ${unit}`;
}

export interface KpiDelta {
  kpiId: string;
  name: string;
  unit?: string;
  current: number | null;
  previous: number | null;
  /** Delta percentual BRUTO (current vs previous), apenas para exibição numérica. */
  deltaPct: number | null;
  /** Delta percentual ORIENTADO pela direção: positivo = bom, negativo = ruim. */
  orientedDeltaPct: number | null;
  ragStatus: string;
  direction: 'up' | 'down' | null;
}

export interface KpiNoData {
  kpiId: string;
  name: string;
  unit?: string;
}

export function computeKpiDeltas(
  kpis: MbrKpiSnapshot[],
  options: { topN?: number } = {},
): {
  ups: KpiDelta[];
  downs: KpiDelta[];
  noData: KpiNoData[];
  withoutComparison: number;
} {
  const topN = options.topN ?? 3;
  const deltas: KpiDelta[] = kpis.map((k) => {
    const rawDelta =
      k.previousValue != null && k.currentValue != null && k.previousValue !== 0
        ? ((k.currentValue - k.previousValue) / Math.abs(k.previousValue)) * 100
        : null;
    const direction = (k.direction ?? null) as 'up' | 'down' | null;
    const oriented = orientedDeltaPct(rawDelta, direction);
    return {
      kpiId: k.kpiId,
      name: k.name,
      unit: k.unit,
      current: k.currentValue,
      previous: k.previousValue,
      deltaPct: rawDelta != null ? Math.round(rawDelta * 10) / 10 : null,
      orientedDeltaPct: oriented != null ? Math.round(oriented * 10) / 10 : null,
      ragStatus: k.ragStatus,
      direction,
    };
  });

  const withDelta = deltas.filter((d) => d.orientedDeltaPct != null);
  const ups = [...withDelta]
    .filter((d) => (d.orientedDeltaPct ?? 0) > 0)
    .sort((a, b) => (b.orientedDeltaPct ?? 0) - (a.orientedDeltaPct ?? 0))
    .slice(0, topN);
  const downs = [...withDelta]
    .filter((d) => (d.orientedDeltaPct ?? 0) < 0)
    .sort((a, b) => (a.orientedDeltaPct ?? 0) - (b.orientedDeltaPct ?? 0))
    .slice(0, topN);

  const noData: KpiNoData[] = kpis
    .filter((k) => k.currentValue == null)
    .map((k) => ({ kpiId: k.kpiId, name: k.name, unit: k.unit }));

  return {
    ups,
    downs,
    noData,
    withoutComparison: deltas.length - withDelta.length,
  };
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

const KpiDeltaRow = memo(function KpiDeltaRow({
  delta,
  direction,
}: {
  delta: KpiDelta;
  direction: 'up' | 'down';
}) {
  const Icon = direction === 'up' ? ArrowUpRight : ArrowDownRight;
  const color = direction === 'up' ? 'text-status-green' : 'text-status-red';
  const directionHint =
    delta.direction === 'down'
      ? ' · menor é melhor'
      : delta.direction === 'up'
        ? ''
        : '';
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon className={cn('h-4 w-4 shrink-0', color)} />
        <span className="text-sm text-foreground truncate" title={`${delta.name}${directionHint}`}>
          {delta.name}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-xs">
        <span className="text-muted-foreground">
          {formatKpiValue(delta.previous, delta.unit)} → {formatKpiValue(delta.current, delta.unit)}
        </span>
        <span className={cn('font-semibold', color)}>
          {(delta.deltaPct ?? 0) > 0 ? '+' : ''}
          {delta.deltaPct?.toFixed(1)}%
        </span>
      </div>
    </div>
  );
});

// ============================================================
// COMPONENT
// ============================================================

export interface KpiMonthlyComparisonCardProps {
  snapshots: MbrKpiSnapshot[];
  /** Título do bloco. Default: "Comparativo vs mês anterior". */
  title?: string;
  /** Slot opcional à direita do título (ex: badge de origem). */
  headerRight?: React.ReactNode;
  /** Microcopy quando não há nenhum delta calculável. */
  emptyMessage?: string;
  className?: string;
  /** Renderiza terceiro bloco "Sem dados". Default: false. */
  showNoData?: boolean;
  /** Top-N por bloco. Default: 3. */
  topN?: number;
}

export const KpiMonthlyComparisonCard = memo(function KpiMonthlyComparisonCard({
  snapshots,
  title = 'Comparativo vs mês anterior',
  headerRight,
  emptyMessage = 'Sem dados comparáveis no período.',
  className,
  showNoData = false,
  topN = 3,
}: KpiMonthlyComparisonCardProps) {
  const deltas = useMemo(
    () => computeKpiDeltas(snapshots, { topN }),
    [snapshots, topN],
  );
  const hasComparison = deltas.ups.length + deltas.downs.length > 0;
  const hasNoData = showNoData && deltas.noData.length > 0;

  if (!hasComparison && deltas.withoutComparison === 0 && !hasNoData) {
    return null;
  }

  const columns = showNoData ? 'md:grid-cols-3' : 'md:grid-cols-2';

  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border border-border bg-card p-4',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
        <div className="flex items-center gap-2">
          {!showNoData && deltas.withoutComparison > 0 && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {deltas.withoutComparison} sem dado anterior
            </Badge>
          )}
          {headerRight}
        </div>
      </div>

      {hasComparison || hasNoData ? (
        <div className={cn('grid grid-cols-1 gap-x-6 gap-y-2', columns)}>
          <div>
            <p className="text-xs font-semibold text-status-green mb-1">Maiores avanços</p>
            {deltas.ups.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum KPI avançou este mês.</p>
            ) : (
              deltas.ups.map((d) => <KpiDeltaRow key={d.kpiId} delta={d} direction="up" />)
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-status-red mb-1">Maiores quedas</p>
            {deltas.downs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum KPI piorou este mês.</p>
            ) : (
              deltas.downs.map((d) => <KpiDeltaRow key={d.kpiId} delta={d} direction="down" />)
            )}
          </div>
          {showNoData && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Sem dados</p>
              {deltas.noData.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Todos os KPIs com dados.</p>
              ) : (
                deltas.noData.map((k) => (
                  <div
                    key={k.kpiId}
                    className="flex items-center justify-between gap-3 py-1.5 min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <KpiNameLink
                        kpiId={k.kpiId}
                        name={k.name}
                        className="text-sm text-foreground truncate"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
      )}
    </div>
  );
});
