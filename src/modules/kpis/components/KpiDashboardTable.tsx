/**
 * KpiDashboardTable - Visualização em tabela para o Dashboard de KPIs
 * v2.86.0: Mostra indicadores em formato tabular com colunas padronizadas
 */

import { TrendingUp, TrendingDown, Minus, Clock, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { KpiWithValues, RAG_STATUS_CONFIG, INDICATOR_TYPE_LABELS, FREQUENCY_LABELS } from "../types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KpiDashboardTableProps {
  kpis: KpiWithValues[];
  onKpiClick: (kpi: KpiWithValues) => void;
  isLoading?: boolean;
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return "—";
  
  switch (unit) {
    case '%':
      return `${value.toFixed(1)}%`;
    case 'R$':
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'horas':
      return `${value.toFixed(1)}h`;
    case 'dias':
      return `${value.toFixed(0)} dias`;
    default:
      return value.toLocaleString("pt-BR");
  }
}

function TableSkeleton() {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Indicador</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Área</TableHead>
            <TableHead className="text-right">Valor Atual</TableHead>
            <TableHead className="text-right">Meta</TableHead>
            <TableHead className="text-right">Variação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Atualização</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
              <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function KpiDashboardTable({ kpis, onKpiClick, isLoading }: KpiDashboardTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Indicador</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Área</TableHead>
            <TableHead className="text-right">Valor Atual</TableHead>
            <TableHead className="text-right">Meta</TableHead>
            <TableHead className="text-right">Variação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Atualização</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kpis.map((kpi) => {
            const ragConfig = RAG_STATUS_CONFIG[kpi.rag_status];
            const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
            const trendColor = kpi.direction === 'up'
              ? kpi.trend === 'up' ? 'text-status-green' : kpi.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
              : kpi.trend === 'down' ? 'text-status-green' : kpi.trend === 'up' ? 'text-destructive' : 'text-muted-foreground';

            const lastUpdate = kpi.last_updated_at ? parseISO(kpi.last_updated_at) : null;

            return (
              <TableRow 
                key={kpi.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onKpiClick(kpi)}
              >
                {/* Indicador */}
                <TableCell>
                  <div className="min-w-0">
                    <p className="font-medium truncate max-w-[200px]">{kpi.name}</p>
                    {kpi.team && (
                      <p className="text-xs text-muted-foreground truncate">{kpi.team.name}</p>
                    )}
                  </div>
                </TableCell>

                {/* Tipo */}
                <TableCell>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {INDICATOR_TYPE_LABELS[kpi.indicator_type]}
                  </Badge>
                </TableCell>

                {/* Área */}
                <TableCell>
                  {kpi.area ? (
                    <Badge 
                      variant="outline" 
                      className="text-xs whitespace-nowrap"
                      style={{ 
                        borderColor: kpi.area.color || undefined, 
                        color: kpi.area.color || undefined 
                      }}
                    >
                      {kpi.area.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Valor Atual */}
                <TableCell className="text-right font-medium tabular-nums">
                  {formatValue(kpi.current_value, kpi.unit)}
                </TableCell>

                {/* Meta */}
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {kpi.target_value ? formatValue(kpi.target_value, kpi.unit) : '—'}
                </TableCell>

                {/* Variação */}
                <TableCell className="text-right">
                  {kpi.variation !== null ? (
                    <div className={cn("flex items-center justify-end gap-1", trendColor)}>
                      <TrendIcon className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{Math.abs(kpi.variation).toFixed(1)}%</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs whitespace-nowrap", ragConfig.color, ragConfig.bgColor)}
                  >
                    {ragConfig.label}
                  </Badge>
                </TableCell>

                {/* Responsável */}
                <TableCell>
                  {kpi.owner ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={kpi.owner.photo_url || undefined} />
                          <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                            {kpi.owner.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{kpi.owner.display_name}</p>
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
                          <span>{format(lastUpdate, "dd/MM", { locale: ptBR })}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{format(lastUpdate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
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
