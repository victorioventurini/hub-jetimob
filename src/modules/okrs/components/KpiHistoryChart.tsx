import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  AlertTriangle,
  Info,
  ChartLine,
  Shield,
} from "lucide-react";
import { useKrKpiHistory, useKpiChartData, type KpiHistoryData } from "../hooks/useKpiHistory";
import { cn } from "@/lib/utils";

interface KpiHistoryChartProps {
  krId: string;
  krType: "org" | "team";
  className?: string;
}

/**
 * KPI History & Trend visualization component
 * Shows primary KPI history and guardrails
 */
export function KpiHistoryChart({ krId, krType, className }: KpiHistoryChartProps) {
  const { primaryHistory, guardrailHistories, isLoading, hasPrimaryKpi, hasGuardrails } = useKrKpiHistory(krId, krType);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasPrimaryKpi) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ChartLine className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum KPI vinculado a esta KR.</p>
          <p className="text-xs mt-1">Vincule um KPI primário para visualizar o histórico.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ChartLine className="w-4 h-4" />
            Histórico & Tendência
          </CardTitle>
          {hasGuardrails && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  {guardrailHistories.length} guardrail(s)
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Guardrails monitoram métricas que não devem degradar enquanto a meta principal é perseguida.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="primary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="primary" className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Primário
            </TabsTrigger>
            <TabsTrigger value="guardrails" disabled={!hasGuardrails} className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Guardrails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="primary" className="space-y-4">
            {primaryHistory && <SingleKpiChart history={primaryHistory} />}
          </TabsContent>

          <TabsContent value="guardrails" className="space-y-4">
            {guardrailHistories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum guardrail configurado.
              </div>
            ) : (
              <div className="space-y-4">
                {guardrailHistories.map((history) => (
                  history && <SingleKpiChart key={history.kpi.id} history={history as KpiHistoryData} compact />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface SingleKpiChartProps {
  history: KpiHistoryData;
  compact?: boolean;
}

function SingleKpiChart({ history, compact = false }: SingleKpiChartProps) {
  const { data, minValue, maxValue, targetLine } = useKpiChartData(history);

  const TrendIcon = history.trend === "up" ? TrendingUp : history.trend === "down" ? TrendingDown : Minus;
  const trendColor = history.kpi.direction === "up"
    ? history.trend === "up" ? "text-status-green" : history.trend === "down" ? "text-status-red" : "text-muted-foreground"
    : history.trend === "down" ? "text-status-green" : history.trend === "up" ? "text-status-red" : "text-muted-foreground";

  const isOnTrack = history.kpi.target_value !== null && history.currentValue !== null && (
    history.kpi.direction === "up" 
      ? history.currentValue >= history.kpi.target_value 
      : history.currentValue <= history.kpi.target_value
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{history.kpi.name}</span>
            <Badge variant="outline" className="text-[10px]">{history.kpi.unit}</Badge>
          </div>
          {history.currentValue !== null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-2xl font-semibold">
                {history.currentValue.toLocaleString("pt-BR")}
              </span>
              <span className="text-muted-foreground">{history.kpi.unit}</span>
              <TrendIcon className={cn("w-4 h-4", trendColor)} />
              {history.variation !== null && (
                <span className={cn("text-xs", trendColor)}>
                  {history.variation > 0 ? "+" : ""}{history.variation.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {targetLine !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={isOnTrack ? "default" : "secondary"} className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {targetLine.toLocaleString("pt-BR")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Meta: {targetLine.toLocaleString("pt-BR")} {history.kpi.unit}
              </TooltipContent>
            </Tooltip>
          )}
          {!isOnTrack && targetLine !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="w-4 h-4 text-status-amber" />
              </TooltipTrigger>
              <TooltipContent>
                Valor atual está {history.kpi.direction === "up" ? "abaixo" : "acima"} da meta
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Chart */}
      {data.length > 1 ? (
        <div className={cn("w-full", compact ? "h-32" : "h-48")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id={`gradient-${history.kpi.id}`} x1="0" y1="0" x2="0" y2="1">
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
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                      <p className="font-medium">{data.fullDate}</p>
                      <p className="text-muted-foreground">
                        Valor: <span className="text-foreground font-medium">{data.value.toLocaleString("pt-BR")} {history.kpi.unit}</span>
                      </p>
                      {data.target !== null && (
                        <p className="text-muted-foreground">
                          Meta: <span className="text-foreground">{data.target.toLocaleString("pt-BR")}</span>
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              {targetLine !== null && (
                <ReferenceLine 
                  y={targetLine} 
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
                fill={`url(#gradient-${history.kpi.id})`}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : data.length === 1 ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
          <Info className="w-4 h-4 mr-2" />
          Apenas 1 registro. Adicione mais valores para visualizar a tendência.
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
          <Info className="w-4 h-4 mr-2" />
          Nenhum valor registrado ainda.
        </div>
      )}

      {/* Info footer */}
      {data.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>{data.length} registro(s)</span>
          <span>
            Direção: {history.kpi.direction === "up" ? "↑ Maior é melhor" : "↓ Menor é melhor"}
          </span>
        </div>
      )}
    </div>
  );
}
