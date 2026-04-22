/**
 * CriticalKpiComparison
 *
 * Data-driven card showing the relationship between MRR Churn,
 * MRR commit, and Marketing & Sales budget for the quarter.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { qbrKeys } from '@/lib/queryKeys/okrs';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const KPI_IDS = {
  mrrChurn: 'db355067-64bf-403b-b24b-f0d961ab4f3c',
  mrrCommit: '6b8c68f8-55d4-48aa-9520-a486d879fba8',
  expansion: 'c6d1834b-ae82-4f40-bd2c-63233c8f6d23',
  budget: '916f4cbf-beee-4819-ad24-54322101e645',
} as const;

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
};

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface KpiRow {
  kpi_id: string;
  reference_date: string;
  value: number;
}

export function CriticalKpiComparison({ cycleId }: { cycleId: string | null }) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  const { data, isLoading } = useQuery({
    queryKey: qbrKeys.criticalKpiComparison(currentBuId, cycleId),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('kpi_values')
        .select('kpi_id, reference_date, value')
        .in('kpi_id', Object.values(KPI_IDS))
        .gte('reference_date', '2026-01-01')
        .lte('reference_date', '2026-03-31')
        .order('reference_date', { ascending: true });

      if (error) throw error;
      return rows as KpiRow[];
    },
    enabled: !!currentBuId && !!cycleId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const byKpi = (id: string) => data.filter((r) => r.kpi_id === id);

  const churnRows = byKpi(KPI_IDS.mrrChurn);
  const commitRows = byKpi(KPI_IDS.mrrCommit);
  const expansionRows = byKpi(KPI_IDS.expansion);
  const budgetRows = byKpi(KPI_IDS.budget);

  const sumChurn = churnRows.reduce((s, r) => s + r.value, 0);
  const sumCommit = commitRows.reduce((s, r) => s + r.value, 0);
  const sumExpansion = expansionRows.reduce((s, r) => s + r.value, 0);
  const sumBudget = budgetRows.reduce((s, r) => s + r.value, 0);

  const months = [...new Set(data.map((r) => r.reference_date.slice(5, 7)))].sort();

  const getMonthValue = (rows: KpiRow[], month: string) => {
    const row = rows.find((r) => r.reference_date.slice(5, 7) === month);
    return row ? row.value : null;
  };

  const totalRevenue = sumCommit + sumExpansion;
  const netGain = totalRevenue - sumChurn;

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Relação Churn × Receita × Investimento (Q1 2026)
      </p>

      {/* Monthly breakdown table */}
      <div className="rounded-md border overflow-hidden text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 font-medium text-muted-foreground">Indicador</th>
              {months.map((m) => (
                <th key={m} className="text-right p-2 font-medium text-muted-foreground">
                  {MONTH_LABELS[m] || m}
                </th>
              ))}
              <th className="text-right p-2 font-semibold text-foreground">Total Q1</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-2 flex items-center gap-1.5">
                <TrendingDown className="h-3 w-3 text-status-red" />
                MRR Churn
              </td>
              {months.map((m) => {
                const val = getMonthValue(churnRows, m);
                return (
                  <td key={m} className="text-right p-2 text-status-red">
                    {val != null ? formatBRL(val) : '—'}
                  </td>
                );
              })}
              <td className="text-right p-2 font-semibold text-status-red">{formatBRL(sumChurn)}</td>
            </tr>
            <tr className="border-t">
              <td className="p-2 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-status-green" />
                MRR Commit
              </td>
              {months.map((m) => {
                const val = getMonthValue(commitRows, m);
                return (
                  <td key={m} className="text-right p-2 text-status-green">
                    {val != null ? formatBRL(val) : '—'}
                  </td>
                );
              })}
              <td className="text-right p-2 font-semibold text-status-green">{formatBRL(sumCommit)}</td>
            </tr>
            <tr className="border-t">
              <td className="p-2 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-primary" />
                Receita de Expansão
              </td>
              {months.map((m) => {
                const val = getMonthValue(expansionRows, m);
                return (
                  <td key={m} className="text-right p-2 text-primary">
                    {val != null ? formatBRL(val) : '—'}
                  </td>
                );
              })}
              <td className="text-right p-2 font-semibold text-primary">{formatBRL(sumExpansion)}</td>
            </tr>
            <tr className="border-t">
              <td className="p-2 flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-muted-foreground" />
                Orçamento Mkt & Vendas
              </td>
              {months.map((m) => {
                const val = getMonthValue(budgetRows, m);
                return (
                  <td key={m} className="text-right p-2">
                    {val != null ? formatBRL(val) : '—'}
                  </td>
                );
              })}
              <td className="text-right p-2 font-semibold">{formatBRL(sumBudget)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className={cn(
          'rounded-md px-2.5 py-1.5 font-medium',
          netGain > 0
            ? 'bg-status-green/10 text-status-green'
            : 'bg-status-red/10 text-status-red'
        )}>
          Saldo: {formatBRL(netGain)} ({netGain > 0 ? 'ganho líquido' : 'perda líquida'})
        </div>
        {sumBudget > 0 && (
          <div className="rounded-md px-2.5 py-1.5 bg-muted text-muted-foreground font-medium">
            Investimento total: {formatBRL(sumBudget)}
          </div>
        )}
        {sumBudget > 0 && totalRevenue > 0 && (
          <div className="rounded-md px-2.5 py-1.5 bg-muted text-muted-foreground font-medium">
            Custo por R$1 de MRR: {formatBRL(sumBudget / totalRevenue).replace('R$', 'R$ ')}
          </div>
        )}
      </div>
    </div>
  );
}
