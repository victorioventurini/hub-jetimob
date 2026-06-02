/**
 * KpiEvolutionSection — Visão completa de KPIs com evolução e comparação à meta.
 * 
 * Exibe todas as KPIs ativas agrupadas por escopo (Org > Área > Time),
 * com valor atual, meta, status RAG e histórico de valores.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { qbrKeys } from '@/lib/queryKeys/okrs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { LoadingState } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';

// ============================================================
// TYPES
// ============================================================

interface KpiWithHistory {
  id: string;
  name: string;
  unit: string;
  target_value: number | null;
  direction: string;
  scope: string;
  team_name: string | null;
  latest_value: number | null;
  latest_rag: string | null;
  values: Array<{
    value: number;
    reference_date: string;
    period_label: string | null;
    rag_status: string | null;
  }>;
}

// ============================================================
// HELPERS
// ============================================================

const RAG_CONFIG: Record<string, { label: string; className: string }> = {
  on_track: { label: 'No alvo', className: 'bg-status-green-muted text-status-green' },
  at_risk: { label: 'Atenção', className: 'bg-status-amber-muted text-status-amber' },
  off_track: { label: 'Crítico', className: 'bg-status-red-muted text-status-red' },
  no_data: { label: 'Sem dados', className: 'bg-muted text-muted-foreground' },
};

const SCOPE_LABELS: Record<string, string> = {
  org: 'Organizacional',
  area: 'Área',
  team: 'Time',
};

function formatKpiValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return '—';
  
  if (unit === 'R$') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  if (unit === '%') {
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }
  if (unit === 'x') {
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x`;
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`;
}

function computeAttainment(value: number | null, target: number | null, direction: string): number | null {
  if (value === null || target === null || target === 0) return null;
  if (direction === 'down') {
    // For "lower is better", invert: if target=2 and value=1.8, attainment > 100%
    return target === 0 ? null : ((2 * target - value) / target) * 100;
  }
  return (value / target) * 100;
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === 'down') return <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />;
  if (direction === 'stable') return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  return <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function KpiGroupTable({ title, kpis }: { title: string; kpis: KpiWithHistory[] }) {
  if (kpis.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Indicador</TableHead>
              <TableHead className="w-20 text-center">Dir.</TableHead>
              <TableHead className="w-28 text-right">Atual</TableHead>
              <TableHead className="w-28 text-right">Meta</TableHead>
              <TableHead className="w-32">Atingimento</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead className="w-40">Histórico</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {kpis.map(kpi => {
              const rag = RAG_CONFIG[kpi.latest_rag || 'no_data'] || RAG_CONFIG.no_data;
              const attainment = computeAttainment(kpi.latest_value, kpi.target_value, kpi.direction);
              const clampedAttainment = attainment !== null ? Math.min(attainment, 100) : 0;

              return (
                <TableRow key={kpi.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium">{kpi.name}</span>
                      {kpi.team_name && (
                        <p className="text-xs text-muted-foreground">{kpi.team_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <DirectionIcon direction={kpi.direction} />
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatKpiValue(kpi.latest_value, kpi.unit)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {kpi.target_value !== null ? formatKpiValue(kpi.target_value, kpi.unit) : '—'}
                  </TableCell>
                  <TableCell>
                    {attainment !== null ? (
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={clampedAttainment} 
                          className="h-2 flex-1"
                        />
                        <span className={cn(
                          'text-xs font-medium tabular-nums w-12 text-right',
                          attainment >= 100 ? 'text-status-green' :
                          attainment >= 70 ? 'text-status-amber' :
                          'text-status-red'
                        )}>
                          {attainment.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn('text-[10px]', rag.className)}>
                      {rag.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {kpi.values.length > 0 ? (
                      <div className="flex items-center gap-1">
                        {kpi.values.slice(0, 4).reverse().map((v, i) => (
                          <div
                            key={i}
                            title={`${v.period_label || v.reference_date}: ${formatKpiValue(v.value, kpi.unit)}`}
                            className={cn(
                              'h-5 w-5 rounded text-[9px] font-medium flex items-center justify-center border',
                              v.rag_status === 'on_track' ? 'bg-status-green-muted text-status-green border-status-green/20' :
                              v.rag_status === 'at_risk' ? 'bg-status-amber-muted text-status-amber border-status-amber/20' :
                              v.rag_status === 'off_track' ? 'bg-status-red-muted text-status-red border-status-red/20' :
                              'bg-muted text-muted-foreground border-muted'
                            )}
                          >
                            {i + 1}
                          </div>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-0.5">
                          ({kpi.values.length})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sem registros</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/kpis/${kpi.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function KpiEvolutionSection() {
  const buSupabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  const { data: kpis, isLoading } = useQuery({
    queryKey: qbrKeys.reportKpiEvolution(currentBuId),
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. Fetch active KPIs apenas org + área (ignora métricas e KPIs de time)
      const { data: metrics, error: metricsErr } = await buSupabase
        .from('kpi_metrics')
        .select('id, name, unit, target_value, direction, scope, team_id')
        .eq('lifecycle_status', 'active')
        .eq('indicator_type', 'kpi')
        .in('scope', ['org', 'area'])
        .is('deleted_at', null)
        .order('name');
      if (metricsErr) throw metricsErr;
      if (!metrics || metrics.length === 0) return [];

      // 2. Fetch team names
      const teamIds = [...new Set(metrics.filter(m => m.team_id).map(m => m.team_id!))] ;
      let teamMap = new Map<string, string>();
      if (teamIds.length > 0) {
        const { data: teams } = await buSupabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds);
        for (const t of (teams || [])) teamMap.set(t.id, t.name);
      }

      // 3. Fetch all values
      const kpiIds = metrics.map(m => m.id);
      const { data: allValues } = await buSupabase
        .from('kpi_values')
        .select('kpi_id, value, reference_date, period_label, rag_status')
        .in('kpi_id', kpiIds)
        .order('reference_date', { ascending: false });

      // 4. Group values by KPI
      const valuesByKpi = new Map<string, typeof allValues>();
      for (const v of (allValues || [])) {
        if (!valuesByKpi.has(v.kpi_id)) valuesByKpi.set(v.kpi_id, []);
        valuesByKpi.get(v.kpi_id)!.push(v);
      }

      // 5. Enrich
      return metrics.map(m => {
        const values = valuesByKpi.get(m.id) || [];
        const latest = values[0] || null;
        return {
          id: m.id,
          name: m.name,
          unit: m.unit || '%',
          target_value: m.target_value,
          direction: m.direction || 'up',
          scope: m.scope || 'team',
          team_name: m.team_id ? (teamMap.get(m.team_id) || null) : null,
          latest_value: latest?.value ?? null,
          latest_rag: latest?.rag_status ?? null,
          values: values.map(v => ({
            value: v.value,
            reference_date: v.reference_date,
            period_label: v.period_label,
            rag_status: v.rag_status,
          })),
        } as KpiWithHistory;
      });
    },
  });

  const grouped = useMemo(() => {
    if (!kpis) return { org: [], area: [], team: [] };
    return {
      org: kpis.filter(k => k.scope === 'org'),
      area: kpis.filter(k => k.scope === 'area'),
      team: kpis.filter(k => k.scope === 'team'),
    };
  }, [kpis]);

  const totalKpis = kpis?.length || 0;
  const withTarget = kpis?.filter(k => k.target_value !== null).length || 0;
  const onTrack = kpis?.filter(k => k.latest_rag === 'on_track').length || 0;
  const atRisk = kpis?.filter(k => k.latest_rag === 'at_risk').length || 0;
  const offTrack = kpis?.filter(k => k.latest_rag === 'off_track').length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <LoadingState text="Carregando indicadores..." />
        </CardContent>
      </Card>
    );
  }

  if (!kpis || kpis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-primary" />
            Evolução dos Indicadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum indicador ativo cadastrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-primary" />
          Evolução dos Indicadores
        </CardTitle>
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="secondary" className="text-xs">{totalKpis} indicadores</Badge>
          {withTarget > 0 && <Badge variant="outline" className="text-xs">{withTarget} com meta</Badge>}
          {onTrack > 0 && (
            <Badge variant="outline" className="text-[10px] bg-status-green-muted text-status-green">
              {onTrack} no alvo
            </Badge>
          )}
          {atRisk > 0 && (
            <Badge variant="outline" className="text-[10px] bg-status-amber-muted text-status-amber">
              {atRisk} em atenção
            </Badge>
          )}
          {offTrack > 0 && (
            <Badge variant="outline" className="text-[10px] bg-status-red-muted text-status-red">
              {offTrack} críticos
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <KpiGroupTable title="🏢 Organizacional" kpis={grouped.org} />
        <KpiGroupTable title="📊 Área" kpis={grouped.area} />
        <KpiGroupTable title="👥 Por Time" kpis={grouped.team} />
      </CardContent>
    </Card>
  );
}
