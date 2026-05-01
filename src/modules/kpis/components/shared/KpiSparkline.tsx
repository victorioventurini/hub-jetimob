/**
 * KpiSparkline — Mini-gráfico inline de evolução de KPI.
 *
 * SSOT compacto para exibir as últimas atualizações de um KPI dentro de
 * cards/steps de wizards e listagens, sem o peso do `KpiHistoryChart`
 * (que é embrulhado em Card + Tabs).
 *
 * Reaproveita os hooks canônicos `useKpiHistory` + `useKpiChartData`.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useKpiHistory, useKpiChartData } from '@/modules/okrs/hooks';
import { formatValueWithUnit } from '@/shared/constants/units';
import { cn } from '@/lib/utils';

export interface KpiSparklineProps {
  kpiId: string;
  unit: string;
  target?: number | null;
  /** Altura em pixels. Default: 80. */
  height?: number;
  /** Limita aos últimos N pontos. Default: 12. */
  pointsLimit?: number;
  className?: string;
}

export function KpiSparkline({
  kpiId,
  unit,
  target,
  height = 80,
  pointsLimit = 12,
  className,
}: KpiSparklineProps) {
  const { data: history, isLoading } = useKpiHistory(kpiId);
  const { data: chartData, minValue, maxValue } = useKpiChartData(history);

  if (isLoading) {
    return <Skeleton className={cn('w-full', className)} style={{ height }} />;
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-xs text-muted-foreground',
          className,
        )}
        style={{ height }}
      >
        <Info className="w-3 h-3 mr-1.5" />
        Sem histórico de atualizações.
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-xs text-muted-foreground',
          className,
        )}
        style={{ height }}
      >
        <Info className="w-3 h-3 mr-1.5" />
        Apenas 1 atualização registrada.
      </div>
    );
  }

  // Limitar aos últimos N pontos.
  const data = chartData.slice(-pointsLimit);
  const gradientId = `kpi-sparkline-${kpiId}`;

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={[minValue, maxValue]} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const item = payload[0].payload as { fullDate: string; value: number };
              return (
                <div className="bg-popover border rounded-lg shadow-lg px-2 py-1 text-xs">
                  <p className="font-medium">{item.fullDate}</p>
                  <p className="text-muted-foreground">
                    {formatValueWithUnit(item.value, unit)}
                  </p>
                  {target != null && (
                    <p className="text-muted-foreground">
                      Meta: <span className="text-foreground font-medium">{formatValueWithUnit(target, unit)}</span>
                    </p>
                  )}
                </div>
              );
            }}
          />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke="hsl(var(--primary))"
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              label={{
                value: `Meta: ${formatValueWithUnit(target, unit)}`,
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 9,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 2 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
