import { TeamSelect, AreaSelect, BuUserSelect } from "@/components/selects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCategory, KpiScope, KpiIndicatorType, KpiRagStatus, KpiKrLinkStatus, getScopeLabels, INDICATOR_TYPE_LABELS, RAG_STATUS_CONFIG, KR_LINK_STATUS_LABELS, KpiTrendFilter, TREND_FILTER_LABELS, KpiTrendWindow, KPI_TREND_WINDOWS, TREND_WINDOW_LABELS } from "../types";
import { useBu } from "@/contexts/BuContext";
import { Link2, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

/**
 * v2.89.0 - Filtros do Dashboard de Indicadores
 * 
 * Mudanças:
 * - v2.83.0: Categoria removida (deprecated) - usa Área como ownership
 * - v2.83.0: Adicionado filtro de Escopo
 * - v2.83.0: Adicionado filtro de Tipo de Indicador (KPI/Métrica)
 * - v2.87.0: Adicionado filtro de Status (RAG)
 * - v2.89.0: Adicionado filtro de Vínculo com KRs
 */

/** v3.x — Modos do filtro "Atualização" */
export type KpiNeedsUpdateFilter = 'all' | 'any' | 'overdue' | 'pending';

export const NEEDS_UPDATE_LABELS: Record<KpiNeedsUpdateFilter, string> = {
  all: 'Todos',
  any: 'Precisa de atualização',
  overdue: 'Atualização atrasada',
  pending: 'Consolidação pendente',
};

const TREND_ICONS: Record<KpiTrendFilter, JSX.Element> = {
  growth: <TrendingUp className="h-3.5 w-3.5 text-success" />,
  stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
  decline: <TrendingDown className="h-3.5 w-3.5 text-destructive" />,
};

interface KpiDashboardFiltersProps {
  /** @deprecated v2.82.0 - Use areaId */
  category: KpiCategory | "all";
  teamId: string | "all";
  areaId?: string | "all";
  scope?: KpiScope | "all";
  indicatorType?: KpiIndicatorType | "all";
  ragStatus?: KpiRagStatus | "all";
  krLinkStatus?: KpiKrLinkStatus | "all";
  /** Tendência orientada à meta (melhora/piora) */
  trend?: KpiTrendFilter | "all";
  /** Janela (meses) dos consolidados usados no cálculo da tendência */
  trendWindow?: KpiTrendWindow;
  ownerId?: string | "all";
  /** v3.x — filtro "Atualização" */
  needsUpdate?: KpiNeedsUpdateFilter;
  /** @deprecated v2.82.0 - Category filter is no longer used */
  onCategoryChange: (category: KpiCategory | "all") => void;
  onTeamChange: (teamId: string | "all") => void;
  onAreaChange?: (areaId: string | "all") => void;
  onScopeChange?: (scope: KpiScope | "all") => void;
  onIndicatorTypeChange?: (type: KpiIndicatorType | "all") => void;
  onRagStatusChange?: (status: KpiRagStatus | "all") => void;
  onKrLinkStatusChange?: (status: KpiKrLinkStatus | "all") => void;
  onTrendChange?: (trend: KpiTrendFilter | "all") => void;
  onTrendWindowChange?: (window: KpiTrendWindow) => void;
  onOwnerChange?: (ownerId: string | "all") => void;
  onNeedsUpdateChange?: (value: KpiNeedsUpdateFilter) => void;
}

export function KpiDashboardFilters({
  teamId,
  areaId = "all",
  scope = "all",
  indicatorType = "all",
  ragStatus = "all",
  krLinkStatus = "all",
  trend = "all",
  trendWindow = 6,
  ownerId = "all",
  needsUpdate = "all",
  onTeamChange,
  onAreaChange,
  onScopeChange,
  onIndicatorTypeChange,
  onRagStatusChange,
  onKrLinkStatusChange,
  onTrendChange,
  onTrendWindowChange,
  onOwnerChange,
  onNeedsUpdateChange,
}: KpiDashboardFiltersProps) {
  const { currentBu } = useBu();
  const scopeLabels = getScopeLabels(currentBu?.name);
  
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 w-full">
      {/* Tipo de Indicador - primary filter */}
      {onIndicatorTypeChange && (
        <Select
          value={indicatorType}
          onValueChange={(value) => onIndicatorTypeChange(value as KpiIndicatorType | "all")}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.keys(INDICATOR_TYPE_LABELS) as KpiIndicatorType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {INDICATOR_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Status RAG */}
      {onRagStatusChange && (
        <Select
          value={ragStatus}
          onValueChange={(value) => onRagStatusChange(value as KpiRagStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(RAG_STATUS_CONFIG) as KpiRagStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                <span className={RAG_STATUS_CONFIG[status].color}>
                  {RAG_STATUS_CONFIG[status].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Tendência (orientada à meta) */}
      {onTrendChange && (
        <Select
          value={trend}
          onValueChange={(value) => onTrendChange(value as KpiTrendFilter | "all")}
        >
          <SelectTrigger className="w-full sm:w-[190px]" title="Tendência dos consolidados da janela selecionada, orientada à meta (melhora/piora), com estabilidade em ±2%">
            <SelectValue placeholder="Tendência">
              {trend === "all" ? (
                "Todas as tendências"
              ) : (
                <span className="flex items-center gap-1.5">
                  {TREND_ICONS[trend]}
                  {TREND_FILTER_LABELS[trend]}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Todas as tendências
              </span>
            </SelectItem>
            {(Object.keys(TREND_FILTER_LABELS) as KpiTrendFilter[]).map((key) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-1.5">
                  {TREND_ICONS[key]}
                  {TREND_FILTER_LABELS[key]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Período dos consolidados usados na tendência */}
      {onTrendWindowChange && (
        <Select
          value={String(trendWindow)}
          onValueChange={(value) => onTrendWindowChange(Number(value) as KpiTrendWindow)}
        >
          <SelectTrigger
            className="w-full sm:w-[170px]"
            title="Janela de consolidados considerada no cálculo da tendência"
          >
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {KPI_TREND_WINDOWS.map((w) => (
              <SelectItem key={w} value={String(w)}>
                {TREND_WINDOW_LABELS[w]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* v2.89.0: Vínculo com KRs */}
      {onKrLinkStatusChange && (
        <Select
          value={krLinkStatus}
          onValueChange={(value) => onKrLinkStatusChange(value as KpiKrLinkStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Vínculo com KRs">
              {krLinkStatus === "all" ? (
                "Todos os vínculos"
              ) : (
                <span className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  {KR_LINK_STATUS_LABELS[krLinkStatus]}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os vínculos</SelectItem>
            {(Object.keys(KR_LINK_STATUS_LABELS) as KpiKrLinkStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                <span className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  {KR_LINK_STATUS_LABELS[status]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Área */}
      {onAreaChange && (
        <AreaSelect
          value={areaId === "all" ? undefined : areaId}
          onValueChange={(value) => onAreaChange(value ?? "all")}
          includeAll
          allLabel="Todas as áreas"
          triggerClassName="w-full sm:w-[180px]"
        />
      )}

      {/* Responsável */}
      {onOwnerChange && (
        <BuUserSelect
          value={ownerId === "all" ? undefined : ownerId}
          onValueChange={(value) => onOwnerChange(value ?? "all")}
          placeholder="Responsável"
          allowNone
          noneLabel="Todos os responsáveis"
          className="w-full sm:w-[200px]"
        />
      )}

      {/* v3.x — Atualização (Regra A overdue + Regra B consolidação pendente) */}
      {onNeedsUpdateChange && (
        <Select
          value={needsUpdate}
          onValueChange={(value) => onNeedsUpdateChange(value as KpiNeedsUpdateFilter)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Atualização" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(NEEDS_UPDATE_LABELS) as KpiNeedsUpdateFilter[]).map((key) => (
              <SelectItem key={key} value={key}>
                {NEEDS_UPDATE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}


      {onScopeChange && (
        <Select
          value={scope}
          onValueChange={(value) => onScopeChange(value as KpiScope | "all")}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Escopo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os escopos</SelectItem>
            {(Object.keys(scopeLabels) as KpiScope[]).map((sc) => (
              <SelectItem key={sc} value={sc}>
                {scopeLabels[sc]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Time */}
      <TeamSelect
        value={teamId === "all" ? undefined : teamId}
        onValueChange={(value) => onTeamChange(value ?? "all")}
        includeAll
        allLabel="Todos os times"
        triggerClassName="w-full sm:w-[200px]"
      />
    </div>
  );
}
