import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowRight, Lock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { OkrProgressBar } from "../OkrProgressBar";
import { calculateProgress } from "../../types";
import { RAG_STATUS_COLORS } from "@/lib/colors";
import type { CheckinKrData, CheckinStatus } from "./checkinTypes";
import type { PrimaryKpiData } from "../../hooks/usePrimaryKpiForKr";

interface CheckinProgressBlockProps {
  kr: CheckinKrData;
  currentValue: string;
  status: CheckinStatus;
  isAutomatic: boolean;
  onValueChange: (value: string) => void;
  /** Dados da KPI primária vinculada (se existir) */
  primaryKpi?: PrimaryKpiData | null;
}

// Helpers
function formatValue(value: number | null, unit: string): string {
  if (value === null) return '—';
  if (unit === '%') return `${value}%`;
  if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
  return `${value.toLocaleString('pt-BR')}${unit ? ` ${unit}` : ''}`;
}

function getRagBadgeClass(status: string): string {
  switch (status) {
    case 'green':
      return RAG_STATUS_COLORS.green.badge;
    case 'yellow':
      return RAG_STATUS_COLORS.yellow.badge;
    case 'red':
      return RAG_STATUS_COLORS.red.badge;
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getRagLabel(status: string): string {
  switch (status) {
    case 'green':
      return 'Na meta';
    case 'yellow':
      return 'Em atenção';
    case 'red':
      return 'Fora da meta';
    default:
      return 'Sem dados';
  }
}

export function CheckinProgressBlock({
  kr,
  currentValue,
  status,
  isAutomatic,
  onValueChange,
  primaryKpi,
}: CheckinProgressBlockProps) {
  const previewValue = isAutomatic ? kr.current_value : (parseFloat(currentValue) || kr.current_value);
  const valueDiff = previewValue - kr.current_value;
  const isPositiveChange = kr.direction === 'up' ? valueDiff >= 0 : valueDiff <= 0;
  const newProgress = calculateProgress(kr.baseline, previewValue, kr.target, kr.direction);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Progresso
      </Label>

      {/* Progress bar preview */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <OkrProgressBar
          baseline={kr.baseline}
          current={previewValue}
          target={kr.target}
          direction={kr.direction}
          status={status}
          unit={kr.unit}
          size="md"
        />
      </div>

      {/* Value comparison */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Anterior</p>
          <p className="font-semibold text-sm">{kr.current_value} {kr.unit}</p>
        </div>
        <div className="flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="font-semibold text-sm text-primary">{kr.target} {kr.unit}</p>
        </div>
      </div>

      {/* Value input or locked banner */}
      {isAutomatic ? (
        <div className="rounded-lg border bg-info-muted/50 border-info/30 p-4 space-y-3">
          {/* Header with lock icon */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Lock className="h-4 w-4 text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground">
                {primaryKpi 
                  ? `Esta KR é medida pela KPI "${primaryKpi.kpiName}"`
                  : 'Este KR é atualizado automaticamente pela KPI vinculada'
                }
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                O valor é atualizado automaticamente. Para alterar, atualize a KPI correspondente.
              </p>
            </div>
          </div>

          {/* KPI current state (if available) */}
          {primaryKpi && (
            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50">
              <div>
                <p className="text-xs text-muted-foreground">Valor atual da KPI</p>
                <p className="font-semibold">
                  {formatValue(primaryKpi.currentValue, primaryKpi.kpiUnit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Meta</p>
                <p className="font-medium">
                  {formatValue(primaryKpi.targetValue, primaryKpi.kpiUnit)}
                </p>
              </div>
              <Badge className={cn("shrink-0", getRagBadgeClass(primaryKpi.ragStatus))}>
                {getRagLabel(primaryKpi.ragStatus)}
              </Badge>
            </div>
          )}

          {/* Link to KPI */}
          {primaryKpi && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full"
            >
              <Link
                to={`/kpis?kpi=${primaryKpi.kpiId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Atualizar KPI
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="currentValue">Valor atual *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="currentValue"
              type="number"
              step="any"
              value={currentValue}
              onChange={(e) => onValueChange(e.target.value)}
              className="flex-1"
              required
            />
            <span className="text-sm text-muted-foreground font-medium w-16">{kr.unit}</span>
          </div>
          {valueDiff !== 0 && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositiveChange ? 'text-success' : 'text-destructive'
            )}>
              {isPositiveChange ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>
                {valueDiff > 0 ? '+' : ''}{valueDiff.toFixed(2)} {kr.unit} ({newProgress.toFixed(0)}% da meta)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
