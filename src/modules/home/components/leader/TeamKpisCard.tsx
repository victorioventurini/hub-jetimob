/**
 * TeamKpisCard - Shows KPI summary for the team with real data
 * TCR v3.4.x - Dashboard KPI Card Evolution
 * 
 * Features:
 * - RAG summary counters (green/yellow/red/gray)
 * - Pending updates alert
 * - Top critical KPIs list
 * - Adaptive to user scope (leader sees team, admin sees all)
 */
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight, AlertTriangle, Clock, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KpiSummary, KpiCriticalItem } from "../../types";

interface TeamKpisCardProps {
  kpis: KpiSummary | undefined;
  teamId: string | null;
  isLoading?: boolean;
}

// RAG status badge styles
const ragStyles = {
  on_track: { bg: 'bg-status-green/10', text: 'text-status-green', label: 'No alvo' },
  at_risk: { bg: 'bg-status-yellow/10', text: 'text-status-yellow', label: 'Em risco' },
  off_track: { bg: 'bg-status-red/10', text: 'text-status-red', label: 'Fora' },
  no_data: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Sem dados' },
} as const;

function RagPill({ count, status }: { count: number; status: keyof typeof ragStyles }) {
  const style = ragStyles[status];
  if (count === 0) return null;
  
  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full", style.bg)}>
      <span className={cn("text-sm font-bold", style.text)}>{count}</span>
      <span className={cn("text-xs", style.text)}>{style.label}</span>
    </div>
  );
}

function KpiCriticalRow({ kpi }: { kpi: KpiCriticalItem }) {
  const style = ragStyles[kpi.rag_status] ?? ragStyles.no_data;
  const hasValue = kpi.current_value !== null;
  
  return (
    <Link
      to={`/kpis?id=${kpi.id}`}
      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={cn("w-2 h-2 rounded-full shrink-0", style.bg.replace('/10', ''))} />
        <span className="text-sm text-foreground truncate">{kpi.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasValue ? (
          <span className={cn("font-bold text-sm", style.text)}>
            {formatValue(kpi.current_value!, kpi.unit)}
            {kpi.target_value !== null && (
              <span className="text-muted-foreground font-normal">
                {' / '}{formatValue(kpi.target_value, kpi.unit)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            {kpi.days_since_update > 0 ? `${kpi.days_since_update}d sem dados` : 'Sem dados'}
          </span>
        )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function formatValue(value: number, unit: string): string {
  // Format based on common units
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  if (unit === 'R$' || unit === 'BRL') {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (unit === 'h' || unit === 'horas') {
    return `${value.toFixed(1)}h`;
  }
  // Default: show value with unit
  return unit ? `${value.toLocaleString('pt-BR')} ${unit}` : value.toLocaleString('pt-BR');
}

export function TeamKpisCard({ kpis, teamId, isLoading }: TeamKpisCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Indicadores (KPIs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract data from summary
  const ragSummary = kpis?.rag_summary;
  const needsUpdate = kpis?.needs_update ?? 0;
  const topCritical = (kpis?.top ?? []) as unknown as KpiCriticalItem[];
  const totalKpis = kpis?.tracked_count ?? 0;

  // Empty state
  if (totalKpis === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Indicadores (KPIs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum indicador configurado
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
              Crie KPIs para acompanhar métricas importantes do time
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/kpis">
                Criar indicador
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if there are any critical issues
  const hasIssues = (ragSummary?.red ?? 0) > 0 || (ragSummary?.yellow ?? 0) > 0 || needsUpdate > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Indicadores (KPIs)
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {totalKpis} {totalKpis === 1 ? 'indicador' : 'indicadores'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RAG Summary Pills */}
        {ragSummary && (
          <div className="flex flex-wrap gap-2">
            <RagPill count={ragSummary.green} status="on_track" />
            <RagPill count={ragSummary.yellow} status="at_risk" />
            <RagPill count={ragSummary.red} status="off_track" />
            <RagPill count={ragSummary.gray} status="no_data" />
          </div>
        )}

        {/* Pending Updates Alert */}
        {needsUpdate > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-status-yellow/10 border border-status-yellow/20">
            <Clock className="h-4 w-4 text-status-yellow shrink-0" />
            <span className="text-sm text-status-yellow">
              {needsUpdate} {needsUpdate === 1 ? 'indicador precisa' : 'indicadores precisam'} de atualização
            </span>
          </div>
        )}

        {/* Top Critical KPIs */}
        {topCritical.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Atenção necessária</span>
            </div>
            <div className="space-y-1.5">
              {topCritical.slice(0, 5).map((kpi) => (
                <KpiCriticalRow key={kpi.id} kpi={kpi} />
              ))}
            </div>
          </div>
        )}

        {/* All good message */}
        {!hasIssues && topCritical.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-status-green/10">
            <span className="text-sm text-status-green">
              ✓ Todos os indicadores estão no alvo
            </span>
          </div>
        )}

        {/* CTA */}
        <Button
          asChild
          variant="outline"
          className="w-full gap-2"
        >
          <Link to={teamId ? `/kpis?team=${teamId}` : '/kpis'}>
            Ver todos os indicadores
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
