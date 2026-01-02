import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Minus, Calendar, User, Target, Activity } from "lucide-react";
import { useKpiDetail } from "../hooks/useKpiData";
import { CATEGORY_LABELS, CATEGORY_COLORS, FREQUENCY_LABELS, DIRECTION_LABELS } from "../types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface KpiDetailDialogProps {
  kpiId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KpiDetailDialog({ kpiId, open, onOpenChange }: KpiDetailDialogProps) {
  const { kpi, values, isLoading } = useKpiDetail(kpiId || "");

  if (!kpiId || isLoading || !kpi) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const chartData = [...values]
    .reverse()
    .slice(-12)
    .map((v) => ({
      date: format(parseISO(v.reference_date), "MMM/yy", { locale: ptBR }),
      value: v.value,
    }));

  const currentValue = values[0]?.value ?? null;
  const previousValue = values[1]?.value ?? null;
  let variation: number | null = null;
  let trend: "up" | "down" | "stable" = "stable";

  if (currentValue !== null && previousValue !== null && previousValue !== 0) {
    variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    if (variation > 0.5) trend = "up";
    else if (variation < -0.5) trend = "down";
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    kpi.direction === "up"
      ? trend === "up"
        ? "text-emerald-500"
        : trend === "down"
        ? "text-red-500"
        : "text-muted-foreground"
      : trend === "down"
      ? "text-emerald-500"
      : trend === "up"
      ? "text-red-500"
      : "text-muted-foreground";

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    if (kpi.unit === "%") return `${value.toFixed(1)}%`;
    if (kpi.unit === "R$") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString("pt-BR");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <DialogTitle className="text-xl">{kpi.name}</DialogTitle>
              <Badge
                variant="secondary"
                className={cn("text-xs text-white", CATEGORY_COLORS[kpi.category])}
              >
                {CATEGORY_LABELS[kpi.category]}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Value */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-foreground">
              {formatValue(currentValue)}
            </span>
            {variation !== null && (
              <div className={cn("flex items-center gap-1 text-lg", trendColor)}>
                <TrendIcon className="h-5 w-5" />
                <span>{Math.abs(variation).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {kpi.description && (
            <p className="text-muted-foreground">{kpi.description}</p>
          )}

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {kpi.owner && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Owner:</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={kpi.owner.photo_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {kpi.owner.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{kpi.owner.display_name}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Frequência:</span>
              <span className="text-sm">{FREQUENCY_LABELS[kpi.frequency]}</span>
            </div>

            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Direção:</span>
              <span className="text-sm">{DIRECTION_LABELS[kpi.direction]}</span>
            </div>

            {kpi.target_value !== null && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Meta:</span>
                <span className="text-sm">{formatValue(kpi.target_value)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Evolução</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      tickFormatter={(value) => {
                        if (kpi.unit === "R$") {
                          return `${(value / 1000).toFixed(0)}k`;
                        }
                        return value;
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [formatValue(value), kpi.name]}
                    />
                    {kpi.target_value && (
                      <ReferenceLine
                        y={kpi.target_value}
                        stroke="hsl(var(--accent))"
                        strokeDasharray="5 5"
                        label={{
                          value: "Meta",
                          position: "right",
                          fill: "hsl(var(--accent))",
                          fontSize: 12,
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--accent))", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* History Table */}
          {values.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Histórico</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                        Data
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">
                        Valor
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                        Fonte
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {values.slice(0, 10).map((v, i) => (
                      <tr key={v.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-4 py-2 text-sm">
                          {format(parseISO(v.reference_date), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {formatValue(v.value)}
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground capitalize">
                          {v.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
