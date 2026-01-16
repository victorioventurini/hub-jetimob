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
import { useKrChartData, type KrCheckinHistory } from "../hooks";
import { formatValueWithUnit } from "../constants/krUnits";
import { cn } from "@/lib/utils";

interface KrEvolutionChartProps {
  checkins: KrCheckinHistory[];
  baseline: number;
  target: number;
  unit: string;
  direction: 'up' | 'down' | 'maintain';
  className?: string;
  compact?: boolean;
}

const confidenceColors = {
  high: 'hsl(var(--success))',
  medium: 'hsl(var(--warning))',
  low: 'hsl(var(--destructive))',
};

export function KrEvolutionChart({
  checkins,
  baseline,
  target,
  unit,
  direction,
  className,
  compact = false,
}: KrEvolutionChartProps) {
  const { data, minValue, maxValue } = useKrChartData(checkins, baseline, target);

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-sm", compact ? "h-24" : "h-48", className)}>
        <Info className="w-4 h-4 mr-2" />
        Nenhum check-in registrado ainda.
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-sm", compact ? "h-24" : "h-48", className)}>
        <Info className="w-4 h-4 mr-2" />
        Apenas 1 check-in. Adicione mais para visualizar a evolução.
      </div>
    );
  }

  return (
    <div className={cn("w-full", compact ? "h-32" : "h-48", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="kr-gradient" x1="0" y1="0" x2="0" y2="1">
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
                      {formatValueWithUnit(item.value, unit)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Confiança:{" "}
                    <span
                      className="font-medium"
                      style={{ color: confidenceColors[item.confidence as keyof typeof confidenceColors] }}
                    >
                      {item.confidence === 'high' ? 'Alta' : item.confidence === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </p>
                </div>
              );
            }}
          />
          {/* Baseline reference line */}
          <ReferenceLine
            y={baseline}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
            label={{
              value: "Base",
              position: "left",
              fill: "hsl(var(--muted-foreground))",
              fontSize: 9,
            }}
          />
          {/* Target reference line */}
          <ReferenceLine
            y={target}
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
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#kr-gradient)"
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
