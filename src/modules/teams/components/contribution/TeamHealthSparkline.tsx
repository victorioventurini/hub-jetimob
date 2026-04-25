import React from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { TrendingUp, Minus } from 'lucide-react';

interface TeamHealthSparklineProps {
  data: Array<{ date: string; value: number }>;
  height?: number;
}

/**
 * Sparkline simples de evolução de confiança média do time.
 * - Sem eixos visíveis
 * - Tooltip mínimo
 * - Estado vazio com ícone neutro
 */
export const TeamHealthSparkline = React.memo(function TeamHealthSparkline({
  data,
  height = 60,
}: TeamHealthSparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-xs gap-1"
        style={{ height }}
      >
        <Minus className="h-3 w-3" />
        Sem check-ins recentes
      </div>
    );
  }

  // Caso degenerado: 1 ponto. Recharts precisa de >=2 para linha — duplica.
  const series = data.length === 1 ? [data[0], data[0]] : data;

  const last = data[data.length - 1].value;
  const first = data[0].value;
  const trendUp = last >= first;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <TrendingUp
            className={`h-3 w-3 ${trendUp ? 'text-success' : 'text-destructive rotate-180'}`}
          />
          Evolução (60d)
        </span>
        <span className="font-medium text-foreground">{last}</span>
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <LineChart data={series} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              cursor={false}
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                fontSize: 12,
                padding: '4px 8px',
              }}
              labelFormatter={(label) => label as string}
              formatter={(v: number) => [`${v}/100`, 'Confiança']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
