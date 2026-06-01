/**
 * KpiEvolutionChart - Gráfico de Evolução de Indicadores
 * 
 * Componente reutilizável para visualizar a evolução de KPIs e Métricas.
 * Segue o padrão do KrEvolutionChart para consistência visual.
 * 
 * @see TCR v2.86.0
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { KpiValue, KpiDirection, KpiFrequencyValue } from "../types";
import { getConsolidationPeriod, formatConsolidationPeriodLabel } from "../utils/frequency";
import { useMemo } from "react";

export interface KpiEvolutionChartProps {
  values: KpiValue[];
  targetValue: number | null;
  unit: string;
  direction: KpiDirection;
  className?: string;
  compact?: boolean;
  /**
   * v3.0.0 — Quando true, oculta valores com `input_type='partial'`.
   * O toggle é controlado pelo parent (ex: KpiHistoryDialog via useUrlState).
   */
  onlyConsolidated?: boolean;
  /**
   * v3.32 — Quando informado, deduplica pontos por período de consolidação:
   * mantém o último consolidado do período; se não houver consolidado,
   * mantém apenas o último parcial. Sem a prop, mantém comportamento legado.
   */
  consolidationFrequency?: KpiFrequencyValue | null;
}


const sourceLabels: Record<string, string> = {
  manual: 'Manual',
  api: 'API',
  webhook: 'Webhook',
  spreadsheet: 'Planilha',
  database: 'Banco de Dados',
  integration: 'Integração',
  calculation: 'Cálculo',
};

function formatValue(value: number, unit: string): string {
  if (unit === '%') {
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }
  if (unit === 'R$' || unit === 'BRL') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`;
}


function useKpiChartData(
  values: KpiValue[],
  targetValue: number | null,
  onlyConsolidated: boolean,
  consolidationFrequency: KpiFrequencyValue | null | undefined,
) {
  return useMemo(() => {
    const filtered = onlyConsolidated
      ? values.filter((v) => v.input_type !== 'partial')
      : values;

    if (!filtered?.length) {
      return { data: [], minValue: 0, maxValue: 100 };
    }

    // Dedupe por período de consolidação: prefere consolidated; fallback último partial.
    let deduped = filtered;
    if (consolidationFrequency) {
      const groups = new Map<string, KpiValue[]>();
      for (const v of filtered) {
        const key = getConsolidationPeriod(consolidationFrequency, new Date(v.reference_date)).label;
        const arr = groups.get(key);
        if (arr) arr.push(v);
        else groups.set(key, [v]);
      }
      const picked: KpiValue[] = [];
      for (const arr of groups.values()) {
        const sorted = [...arr].sort(
          (a, b) => new Date(a.reference_date).getTime() - new Date(b.reference_date).getTime(),
        );
        const consolidatedOnes = sorted.filter((v) => v.input_type !== 'partial');
        picked.push(consolidatedOnes.length ? consolidatedOnes[consolidatedOnes.length - 1] : sorted[sorted.length - 1]);
      }
      deduped = picked;
    }

    const sortedValues = [...deduped].sort(
      (a, b) => new Date(a.reference_date).getTime() - new Date(b.reference_date).getTime()
    );

    const data = sortedValues.map((v) => ({
      date: format(parseISO(v.reference_date), "dd/MM", { locale: ptBR }),
      fullDate: format(parseISO(v.reference_date), "dd MMM yyyy", { locale: ptBR }),
      value: v.value,
      source: v.source,
      notes: v.notes,
      ragStatus: v.rag_status,
      inputType: v.input_type ?? 'consolidated',
    }));

    const chartValues = sortedValues.map((v) => v.value);
    const allValues = targetValue !== null ? [...chartValues, targetValue] : chartValues;
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || max * 0.1;

    return {
      data,
      minValue: Math.floor(min - padding),
      maxValue: Math.ceil(max + padding),
    };
  }, [values, targetValue, onlyConsolidated, consolidationFrequency]);
}


export function KpiEvolutionChart({
  values,
  targetValue,
  unit,
  direction: _direction,
  className,
  compact = false,
  onlyConsolidated = false,
  consolidationFrequency = null,
}: KpiEvolutionChartProps) {
  const { data, minValue, maxValue } = useKpiChartData(values, targetValue, onlyConsolidated, consolidationFrequency);


  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-sm", compact ? "h-24" : "h-48", className)}>
        <Info className="w-4 h-4 mr-2" />
        Nenhum valor registrado ainda.
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-sm", compact ? "h-24" : "h-48", className)}>
        <Info className="w-4 h-4 mr-2" />
        Apenas 1 valor. Adicione mais para visualizar a evolução.
      </div>
    );
  }

  return (
    <div className={cn("w-full", compact ? "h-32" : "h-48", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="kpi-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minValue, maxValue]}
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const item = payload[0].payload;
              const isPartial = item.inputType === 'partial';
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                  <p className="font-medium">{item.fullDate}</p>
                  <p className="text-muted-foreground">
                    Valor:{" "}
                    <span className="text-foreground font-medium">
                      {formatValue(item.value, unit)}
                    </span>
                    {isPartial && (
                      <span className="ml-1 text-[10px] italic text-muted-foreground">
                        (parcial)
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    Origem:{" "}
                    <span className="text-foreground">
                      {sourceLabels[item.source] || item.source}
                    </span>
                  </p>
                  {item.notes && (
                    <p className="text-muted-foreground mt-1 text-[10px] max-w-[200px] truncate">
                      {item.notes}
                    </p>
                  )}
                </div>
              );
            }}
          />
          {/* Target reference line */}
          {targetValue !== null && (
            <ReferenceLine
              y={targetValue}
              stroke="hsl(var(--primary))"
              strokeDasharray="5 5"
              strokeOpacity={0.7}
              label={{
                value: `Meta: ${formatValue(targetValue, unit)}`,
                position: "insideTopRight",
                fill: "hsl(var(--muted-foreground))",
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#kpi-gradient)"
            dot={(props: { cx?: number; cy?: number; payload?: { inputType?: string }; index?: number }) => {
              const { cx, cy, payload, index } = props;
              if (cx == null || cy == null) {
                return <g key={`dot-empty-${index ?? 0}`} />;
              }
              const isPartial = payload?.inputType === 'partial';
              return (
                <circle
                  key={`dot-${index ?? cx}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={isPartial ? 'hsl(var(--background))' : 'hsl(var(--primary))'}
                  stroke="hsl(var(--primary))"
                  strokeWidth={isPartial ? 1.5 : 0}
                  strokeDasharray={isPartial ? '2 2' : undefined}
                  opacity={isPartial ? 0.7 : 1}
                />
              );
            }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
