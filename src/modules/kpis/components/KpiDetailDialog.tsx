import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Minus, Calendar, User, Target, Activity, Plug, FileSpreadsheet, Database, Edit3, Webhook, Clock, AlertCircle, Building2, Globe } from "lucide-react";
import { useKpiDetail, useKpiLinkedKrs } from "@/modules/kpis/hooks";
import { LinkedKrsSection } from "./LinkedKrsSection";
import { KpiActionsMenu } from "./KpiActionsMenu";
import { CATEGORY_LABELS, CATEGORY_COLORS, FREQUENCY_LABELS, DIRECTION_LABELS, SOURCE_TYPE_LABELS, SCOPE_LABELS, KpiValueSource, KpiScope } from "../types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface KpiDetailDialogProps {
  kpiId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SourceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'api':
      return <Plug className="h-4 w-4" />;
    case 'webhook':
      return <Webhook className="h-4 w-4" />;
    case 'spreadsheet':
      return <FileSpreadsheet className="h-4 w-4" />;
    case 'database':
      return <Database className="h-4 w-4" />;
    default:
      return <Edit3 className="h-4 w-4" />;
  }
};

const getSourceColor = (type: string) => {
  switch (type) {
    case 'manual':
      return 'text-info bg-info-muted dark:bg-info-muted/20';
    case 'api':
      return 'text-status-green bg-status-green-muted dark:bg-status-green-muted/20';
    case 'webhook':
      return 'text-surface-administer bg-surface-administer-muted dark:bg-surface-administer-muted/20';
    case 'spreadsheet':
      return 'text-status-yellow bg-status-yellow-muted dark:bg-status-yellow-muted/20';
    case 'database':
      return 'text-info bg-info-muted dark:bg-info-muted/20';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export function KpiDetailDialog({ kpiId, open, onOpenChange }: KpiDetailDialogProps) {
  const { kpi, values, isLoading } = useKpiDetail(kpiId || "");
  const { primaryKrs, guardrailKrs, isLoading: isLoadingKrs } = useKpiLinkedKrs(kpiId);
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
  const lastValue = values[0];
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
        ? "text-status-green"
        : trend === "down"
        ? "text-status-red"
        : "text-muted-foreground"
      : trend === "down"
      ? "text-status-green"
      : trend === "up"
      ? "text-status-red"
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
    if (kpi.unit === "horas") return `${value.toFixed(1)}h`;
    if (kpi.unit === "score") return value.toFixed(0);
    return value.toLocaleString("pt-BR");
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <DialogTitle className="text-xl">{kpi.name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn("text-xs text-white", CATEGORY_COLORS[kpi.category])}
                >
                  {CATEGORY_LABELS[kpi.category]}
                </Badge>
                <Badge variant="outline" className={cn("text-xs gap-1", getSourceColor(kpi.source_type))}>
                  <SourceIcon type={kpi.source_type} />
                  {SOURCE_TYPE_LABELS[kpi.source_type]}
                </Badge>
              </div>
            </div>
            {/* Actions Menu for owners/admins */}
            <KpiActionsMenu kpi={kpi} />
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

          {/* Last Update Info Box */}
          {lastValue && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Última Atualização
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">{formatDateTime(lastValue.created_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Origem:</span>
                  <p className="font-medium flex items-center gap-1.5">
                    <SourceIcon type={lastValue.source} />
                    {SOURCE_TYPE_LABELS[lastValue.source as KpiValueSource] || lastValue.source}
                  </p>
                </div>
                {lastValue.source === 'manual' && lastValue.created_by_user && (
                  <div>
                    <span className="text-muted-foreground">Por:</span>
                    <p className="font-medium flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {lastValue.created_by_user.display_name}
                    </p>
                  </div>
                )}
              </div>
              {lastValue.notes && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Observação:</span>
                  <p className="text-sm">{lastValue.notes}</p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {/* v2.2: Área dona */}
            {kpi.area && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" style={{ color: kpi.area.color || undefined }} />
                <span className="text-sm text-muted-foreground">Área:</span>
                <span className="text-sm font-medium">{kpi.area.name}</span>
              </div>
            )}

            {/* v2.2: Escopo */}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Escopo:</span>
              <span className="text-sm">{SCOPE_LABELS[(kpi.scope as KpiScope) || 'team']}</span>
            </div>

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

          {/* Linked KRs Section */}
          <LinkedKrsSection
            primaryKrs={primaryKrs}
            guardrailKrs={guardrailKrs}
            isLoading={isLoadingKrs}
          />

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
              <h3 className="font-medium text-foreground">Histórico de Atualizações</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                        Data / Hora
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">
                        Valor
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                        Origem
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                        Usuário
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {values.slice(0, 10).map((v, i) => (
                      <tr key={v.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-4 py-2 text-sm">
                          <div>{format(parseISO(v.reference_date), "dd/MM/yyyy")}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(v.created_at), "HH:mm")}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {formatValue(v.value)}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className={cn("text-xs gap-1", getSourceColor(v.source))}>
                            <SourceIcon type={v.source} />
                            {SOURCE_TYPE_LABELS[v.source as KpiValueSource] || v.source}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">
                          {v.source === 'manual' && v.created_by_user ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={v.created_by_user.photo_url || undefined} />
                                <AvatarFallback className="text-[8px]">
                                  {v.created_by_user.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{v.created_by_user.display_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
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
