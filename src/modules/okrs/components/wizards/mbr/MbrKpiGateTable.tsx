/**
 * MbrKpiGateTable — Tabela canônica para listagem de KPIs no KPI Gate (MBR).
 *
 * Espelha o layout de `KpiDashboardTable` (`/kpis`), adaptado para o snapshot
 * mensal `MbrMonthlyKpiSnapshot` (valor do mês de referência vs anterior).
 *
 * Colunas: Indicador, Tipo, Área, Valor (mês), Meta, Variação, Status,
 * Responsável, Atualização.
 */

import { TrendingUp, TrendingDown, Minus, Clock, Users } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { INDICATOR_TYPE_LABELS, RAG_STATUS_CONFIG, type KpiIndicatorType, type KpiRagStatus } from '@/modules/kpis/types';
import { KpiScopeBadge } from '@/modules/kpis/components/KpiScopeBadge';
import { useBu } from '@/contexts/BuContext';
import type { MbrMonthlyKpiSnapshot } from '@/modules/okrs/hooks/useMbrMonthlyKpisByScope';

interface MbrKpiGateTableProps {
  snapshots: MbrMonthlyKpiSnapshot[];
  monthLabel: string;
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
    default:
      return value.toLocaleString('pt-BR');
  }
}

function computeVariation(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function MbrKpiGateTable({ snapshots, monthLabel }: MbrKpiGateTableProps) {
  const { currentBu } = useBu();

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Indicador</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Área</TableHead>
            <TableHead className="text-right whitespace-nowrap">Valor {monthLabel}</TableHead>
            <TableHead className="text-right">Meta</TableHead>
            <TableHead className="text-right">Variação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Atualização</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshots.map((s) => {
            const ragKey = (s.ragStatus === 'no_data' ? 'no_data' : s.ragStatus) as KpiRagStatus;
            const ragConfig = RAG_STATUS_CONFIG[ragKey];
            const variation = computeVariation(s.currentValue, s.previousValue);
            const trend: 'up' | 'down' | 'flat' = variation == null
              ? 'flat'
              : variation > 0 ? 'up' : variation < 0 ? 'down' : 'flat';
            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
            const dir = s.direction ?? 'up';
            const trendColor = dir === 'up'
              ? trend === 'up' ? 'text-status-green' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
              : trend === 'down' ? 'text-status-green' : trend === 'up' ? 'text-destructive' : 'text-muted-foreground';

            const lastUpdate = s.lastValueAt ? parseISO(s.lastValueAt) : null;
            const indicatorLabel = s.indicatorType
              ? INDICATOR_TYPE_LABELS[s.indicatorType as KpiIndicatorType] ?? s.indicatorType
              : 'KPI';

            const area = s.areaId
              ? { id: s.areaId, name: s.areaName ?? '—', color: s.areaColor }
              : null;

            return (
              <TableRow key={s.kpiId} className="hover:bg-muted/50">
                {/* Indicador */}
                <TableCell>
                  <p className="font-medium truncate max-w-[240px]">{s.name}</p>
                </TableCell>

                {/* Tipo */}
                <TableCell>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {indicatorLabel}
                  </Badge>
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

                {/* Valor (mês) */}
                <TableCell className="text-right font-medium tabular-nums">
                  {formatValue(s.currentValue, s.unit)}
                </TableCell>

                {/* Meta */}
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {s.target != null ? formatValue(s.target, s.unit) : '—'}
                </TableCell>

                {/* Variação */}
                <TableCell className="text-right">
                  {variation !== null ? (
                    <div className={cn('flex items-center justify-end gap-1', trendColor)}>
                      <TrendIcon className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{Math.abs(variation).toFixed(2)}%</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  {ragConfig && (
                    <Badge
                      variant="outline"
                      className={cn('text-xs whitespace-nowrap', ragConfig.color, ragConfig.bgColor)}
                    >
                      {ragConfig.label}
                    </Badge>
                  )}
                </TableCell>

                {/* Responsável */}
                <TableCell>
                  {s.owner ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={s.owner.photo_url || undefined} />
                          <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                            {s.owner.display_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{s.owner.display_name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Atualização */}
                <TableCell>
                  {lastUpdate ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(lastUpdate, 'dd/MM', { locale: ptBR })}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{format(lastUpdate, "dd/MM/yyyy", { locale: ptBR })}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
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
