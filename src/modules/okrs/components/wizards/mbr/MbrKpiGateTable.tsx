/**
 * MbrKpiGateTable — Tabela canônica para listagem de KPIs no KPI Gate (MBR).
 *
 * Colunas: Indicador, Área, [mês anterior], [mês atual] / Meta, Variação %.
 */

import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaBadge } from '@/components/ui/area-badge';
import { cn } from '@/lib/utils';
import { KpiScopeBadge } from '@/modules/kpis/components/KpiScopeBadge';
import { useBu } from '@/contexts/BuContext';
import { isPointsUnit } from '@/shared/constants/units';
import type { MbrMonthlyKpiSnapshot } from '@/modules/okrs/hooks/useMbrMonthlyKpisByScope';

interface MbrKpiGateTableProps {
  snapshots: MbrMonthlyKpiSnapshot[];
  /** Rótulo do mês de referência (atual). Ex.: "abril de 2026". */
  monthLabel: string;
  /** Rótulo do mês imediatamente anterior. Ex.: "março de 2026". */
  previousMonthLabel: string;
}

function formatValue(value: number | null, unit: string | undefined): string {
  if (value === null || value === undefined) return '—';
  switch (unit) {
    case '%':
      return `${value.toFixed(2)}%`;
    case 'R$':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'horas':
      return `${value.toFixed(1)}h`;
    case 'dias':
      return `${value.toFixed(0)} dias`;
    case 'Pontos':
      return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pts`;
    default:
      return value.toLocaleString('pt-BR');
  }
}

function computeVariation(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function MbrKpiGateTable({ snapshots, monthLabel, previousMonthLabel }: MbrKpiGateTableProps) {
  const { currentBu } = useBu();

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Indicador</TableHead>
            <TableHead>Área</TableHead>
            <TableHead className="text-right whitespace-nowrap">{capitalize(previousMonthLabel)}</TableHead>
            <TableHead className="text-right whitespace-nowrap">{capitalize(monthLabel)} / Meta</TableHead>
            <TableHead className="text-right whitespace-nowrap">Variação %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshots.map((s) => {
            const variation = computeVariation(s.currentValue, s.previousValue);
            const trend: 'up' | 'down' | 'flat' = variation == null
              ? 'flat'
              : variation > 0 ? 'up' : variation < 0 ? 'down' : 'flat';
            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
            const dir = s.direction ?? 'up';
            const trendColor = dir === 'up'
              ? trend === 'up' ? 'text-status-green' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
              : trend === 'down' ? 'text-status-green' : trend === 'up' ? 'text-destructive' : 'text-muted-foreground';

            const area = s.areaId
              ? { id: s.areaId, name: s.areaName ?? '—', color: s.areaColor }
              : null;

            return (
              <TableRow key={s.kpiId} className="hover:bg-muted/50">
                {/* Indicador */}
                <TableCell>
                  <p className="font-medium truncate max-w-[240px]">{s.name}</p>
                </TableCell>

                {/* Área */}
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {area && <AreaBadge area={area} />}
                    {s.teamName && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap gap-1">
                        <Users className="h-3 w-3" />
                        {s.teamName}
                      </Badge>
                    )}
                    {s.scope && (
                      <KpiScopeBadge scope={s.scope} buName={currentBu?.name} />
                    )}
                    {!area && !s.teamName && s.scope !== 'org' && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>

                {/* Mês anterior */}
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatValue(s.previousValue, s.unit)}
                </TableCell>

                {/* Mês atual / Meta */}
                <TableCell className="text-right tabular-nums">
                  <span className="font-medium">{formatValue(s.currentValue, s.unit)}</span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-muted-foreground">
                    {s.target != null ? formatValue(s.target, s.unit) : '—'}
                  </span>
                </TableCell>

                {/* Variação % */}
                <TableCell className="text-right">
                  {variation !== null ? (
                    <div className={cn('flex items-center justify-end gap-1', trendColor)}>
                      <TrendIcon className="h-3.5 w-3.5" />
                      <span className="tabular-nums">
                        {isPointsUnit(s.unit) && s.currentValue != null && s.previousValue != null
                          ? `${Math.abs(s.currentValue - s.previousValue).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pts`
                          : `${Math.abs(variation).toFixed(2)}%`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
