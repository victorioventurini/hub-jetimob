import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { calculateProgress } from '../types';
import type { OkrDirection } from '../types';

interface OrgObjective {
  id: string;
  title: string;
}

interface TeamKeyResult {
  id: string;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  linked_org_kr_id?: string | null;
}

interface ProgressSummaryProps {
  orgObjectives: OrgObjective[];
  teamKeyResults: TeamKeyResult[];
  greenCount: number;
  yellowCount: number;
  redCount: number;
  notStartedCount: number;
  isLoading: boolean;
}

export function ProgressSummary({
  orgObjectives,
  teamKeyResults,
  greenCount,
  yellowCount,
  redCount,
  notStartedCount,
  isLoading
}: ProgressSummaryProps) {
  const totalKrs = greenCount + yellowCount + redCount + notStartedCount;

  const chartData = [
    { name: 'No caminho', value: greenCount, color: 'hsl(var(--chart-2))' },
    { name: 'Atenção', value: yellowCount, color: 'hsl(var(--chart-4))' },
    { name: 'Em risco', value: redCount, color: 'hsl(var(--chart-1))' },
    { name: 'Não iniciado', value: notStartedCount, color: 'hsl(var(--muted))' },
  ].filter(item => item.value > 0);

  const chartConfig = {
    green: { label: 'No caminho', color: 'hsl(var(--chart-2))' },
    yellow: { label: 'Atenção', color: 'hsl(var(--chart-4))' },
    red: { label: 'Em risco', color: 'hsl(var(--chart-1))' },
    notStarted: { label: 'Não iniciado', color: 'hsl(var(--muted))' },
  };

  // Calculate average progress
  const avgProgress = teamKeyResults.length > 0
    ? teamKeyResults.reduce((acc, kr) => {
        const progress = calculateProgress(
          Number(kr.baseline) || 0,
          Number(kr.current_value) || 0,
          Number(kr.target) || 0,
          kr.direction || 'up'
        );
        return acc + progress;
      }, 0) / teamKeyResults.length
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5" />
          Resumo de Progresso
        </CardTitle>
        <CardDescription>
          Distribuição dos status dos KRs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="h-[200px]">
            {totalKrs === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Nenhum KR cadastrado
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-2 shadow-md">
                              <p className="text-sm font-medium">{data.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {data.value} KR{data.value !== 1 ? 's' : ''} ({((data.value / totalKrs) * 100).toFixed(0)}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{avgProgress.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Progresso médio</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-md bg-success-muted">
                <div className="w-3 h-3 rounded-full bg-success" />
                <div>
                  <p className="text-sm font-medium">{greenCount}</p>
                  <p className="text-xs text-muted-foreground">No caminho</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md bg-warning-muted">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div>
                  <p className="text-sm font-medium">{yellowCount}</p>
                  <p className="text-xs text-muted-foreground">Atenção</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md bg-danger-muted">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <div>
                  <p className="text-sm font-medium">{redCount}</p>
                  <p className="text-xs text-muted-foreground">Em risco</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium">{notStartedCount}</p>
                  <p className="text-xs text-muted-foreground">Não iniciado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
