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
import type { KpiValue, KpiDirection, SOURCE_TYPE_LABELS } from "../types";
import { useMemo } from "react";

export interface KpiEvolutionChartProps {
  values: KpiValue[];
  targetValue: number | null;
  unit: string;
  direction: KpiDirection;
  className?: string;
  compact?: boolean;
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

function useKpiChartData(values: KpiValue[], targetValue: number | null) {
  return useMemo(() => {
    if (!values?.length) {
      return {
        data: [],
        minValue: 0,
        maxValue: 100,
      };
    }

    // Reverse to show oldest first in chart
    const sortedValues = [...values].sort(
      (a, b) => new Date(a.reference_date).getTime() - new Date(b.reference_date).getTime()
    );

    const data = sortedValues.map((v) => ({
      date: format(parseISO(v.reference_date), "dd/MM", { locale: ptBR }),
      fullDate: format(parseISO(v.reference_date), "dd MMM yyyy", { locale: ptBR }),
      value: v.value,
      source: v.source,
      confidence: v.confidence,
      notes: v.notes,
      ragStatus: v.rag_status,
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
  }, [values, targetValue]);
}

export function KpiEvolutionChart({
  values,
  targetValue,
  unit,
  direction,
  className,
  compact = false,
}: KpiEvolutionChartProps) {
  const { data, minValue, maxValue } = useKpiChartData(values, targetValue);

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
              return (
                <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                  <p className="font-medium">{item.fullDate}</p>
                  <p className="text-muted-foreground">
                    Valor:{" "}
                    <span className="text-foreground font-medium">
                      {formatValue(item.value, unit)}
                    </span>
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
                value: "Meta",
                position: "right",
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
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
