/**
 * KpiDetailContent — Conteúdo reutilizável de detalhe de KPI
 * 
 * Extraído de KpiDetailDialog para uso tanto no dialog quanto na página dedicada.
 * Recebe `kpiId` e renderiza toda a informação do KPI.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AreaBadge } from "@/components/ui/area-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Minus, Calendar, User, Target, Activity, Plug, FileSpreadsheet, Database, Edit3, Webhook, Clock, Building2, Globe } from "lucide-react";
import { useKpiDetail, useKpiLinkedKrs, useKpiMutations } from "@/modules/kpis/hooks";
import { useCanEditKpi } from "../hooks/useCanEditKpi";
import { LinkedKrsSection } from "./LinkedKrsSection";
import { KpiValuesTable } from "./KpiValuesTable";
import { KpiTargetHistorySection } from "./KpiTargetHistorySection";
import { KpiActionsMenu } from "./KpiActionsMenu";
import { KpiMigrationBanner } from "./KpiMigrationBanner";
import { EditKpiDialog } from "./EditKpiDialog";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { FREQUENCY_LABELS, DIRECTION_LABELS, SOURCE_TYPE_LABELS, getScopeLabels, KpiValueSource, KpiScope } from "../types";
import { useBu } from "@/contexts/BuContext";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ============================================================
// HELPERS (internos)
// ============================================================

const SourceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'api': return <Plug className="h-4 w-4" />;
    case 'webhook': return <Webhook className="h-4 w-4" />;
    case 'spreadsheet': return <FileSpreadsheet className="h-4 w-4" />;
    case 'database': return <Database className="h-4 w-4" />;
    default: return <Edit3 className="h-4 w-4" />;
  }
};

const getSourceColor = (type: string) => {
  switch (type) {
    case 'manual': return 'text-info bg-info-muted dark:bg-info-muted/20';
    case 'api': return 'text-status-green bg-status-green-muted dark:bg-status-green-muted/20';
    case 'webhook': return 'text-surface-administer bg-surface-administer-muted dark:bg-surface-administer-muted/20';
    case 'spreadsheet': return 'text-status-yellow bg-status-yellow-muted dark:bg-status-yellow-muted/20';
    case 'database': return 'text-info bg-info-muted dark:bg-info-muted/20';
    default: return 'text-muted-foreground bg-muted';
  }
};

// ============================================================
// TYPES
// ============================================================

export interface KpiDetailContentProps {
  kpiId: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function KpiDetailContent({ kpiId }: KpiDetailContentProps) {
  const { kpi, values, isLoading } = useKpiDetail(kpiId);
  const { primaryKrs, guardrailKrs, isLoading: isLoadingKrs } = useKpiLinkedKrs(kpiId);
  const { currentBu } = useBu();
  const scopeLabels = getScopeLabels(currentBu?.name);
  const { canEdit, canUpdateValues } = useCanEditKpi(kpi || undefined);
  const { updateKpiValue, deleteKpiValue } = useKpiMutations();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading || !kpi) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
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
      ? trend === "up" ? "text-status-green" : trend === "down" ? "text-status-red" : "text-muted-foreground"
      : trend === "down" ? "text-status-green" : trend === "up" ? "text-status-red" : "text-muted-foreground";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-xl font-semibold">{kpi.name}</h1>
          <div className="flex items-center gap-2">
            {kpi.area && <AreaBadge area={kpi.area} />}
            <Badge variant="outline" className={cn("text-xs gap-1", getSourceColor(kpi.source_type))}>
              <SourceIcon type={kpi.source_type} />
              {SOURCE_TYPE_LABELS[kpi.source_type]}
            </Badge>
          </div>
        </div>
        <KpiActionsMenu kpi={kpi} alwaysVisible />
      </div>

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
        {kpi.area && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" style={{ color: kpi.area.color || undefined }} />
            <span className="text-sm text-muted-foreground">Área:</span>
            <span className="text-sm font-medium">{kpi.area.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Escopo:</span>
          <span className="text-sm">{scopeLabels[(kpi.scope as KpiScope) || 'team']}</span>
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
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              Meta ou Benchmark:
              <HelpTooltip
                content="Valor de referência (meta interna, benchmark de mercado, recorde histórico ou outra referência estratégica)."
                size="sm"
              />
            </span>
            <span className="text-sm font-medium">{formatValue(kpi.target_value)}</span>
          </div>
        )}
        {kpi.target_source && (
          <div className="col-span-2">
            <span className="text-sm text-muted-foreground">Fonte:</span>
            <span className="text-sm ml-2">{kpi.target_source}</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Target History */}
      <KpiTargetHistorySection kpiId={kpiId} unit={kpi.unit} />

      <Separator />

      {/* Linked KRs */}
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
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => kpi.unit === "R$" ? `${(value / 1000).toFixed(0)}k` : value}
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
      <div className="space-y-3">
        <h3 className="font-medium text-foreground">Histórico de Atualizações</h3>
        <KpiValuesTable
          values={values}
          unit={kpi.unit}
          direction={kpi.direction}
          isLoading={false}
          kpiName={kpi.name}
          consolidationFrequency={kpi.consolidation_frequency ?? null}
          updateFrequency={kpi.update_frequency ?? null}
          canEdit={canUpdateValues}
          onUpdateValue={async (id, data) => {
            await updateKpiValue.mutateAsync({ id, kpi_id: kpi.id, ...data });
          }}
          onDeleteValue={async (id) => {
            await deleteKpiValue.mutateAsync({ id, kpi_id: kpi.id });
          }}
        />
      </div>
    </div>
  );
}
