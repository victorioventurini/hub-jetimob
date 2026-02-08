import { TeamSelect, AreaSelect } from "@/components/selects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCategory, KpiScope, KpiIndicatorType, KpiRagStatus, KpiKrLinkStatus, getScopeLabels, INDICATOR_TYPE_LABELS, RAG_STATUS_CONFIG, KR_LINK_STATUS_LABELS } from "../types";
import { useBu } from "@/contexts/BuContext";
import { Link2 } from "lucide-react";

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

interface KpiDashboardFiltersProps {
  /** @deprecated v2.82.0 - Use areaId */
  category: KpiCategory | "all";
  teamId: string | "all";
  areaId?: string | "all";
  scope?: KpiScope | "all";
  indicatorType?: KpiIndicatorType | "all";
  ragStatus?: KpiRagStatus | "all";
  krLinkStatus?: KpiKrLinkStatus | "all";
  /** @deprecated v2.82.0 - Category filter is no longer used */
  onCategoryChange: (category: KpiCategory | "all") => void;
  onTeamChange: (teamId: string | "all") => void;
  onAreaChange?: (areaId: string | "all") => void;
  onScopeChange?: (scope: KpiScope | "all") => void;
  onIndicatorTypeChange?: (type: KpiIndicatorType | "all") => void;
  onRagStatusChange?: (status: KpiRagStatus | "all") => void;
  onKrLinkStatusChange?: (status: KpiKrLinkStatus | "all") => void;
}

export function KpiDashboardFilters({
  teamId,
  areaId = "all",
  scope = "all",
  indicatorType = "all",
  ragStatus = "all",
  krLinkStatus = "all",
  onTeamChange,
  onAreaChange,
  onScopeChange,
  onIndicatorTypeChange,
  onRagStatusChange,
  onKrLinkStatusChange,
}: KpiDashboardFiltersProps) {
  const { currentBu } = useBu();
  const scopeLabels = getScopeLabels(currentBu?.name);
  
  return (
    <div className="flex flex-wrap gap-3">
      {/* Tipo de Indicador - primary filter */}
      {onIndicatorTypeChange && (
        <Select
          value={indicatorType}
          onValueChange={(value) => onIndicatorTypeChange(value as KpiIndicatorType | "all")}
        >
          <SelectTrigger className="w-[140px]">
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
          <SelectTrigger className="w-[150px]">
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

      {/* v2.89.0: Vínculo com KRs */}
      {onKrLinkStatusChange && (
        <Select
          value={krLinkStatus}
          onValueChange={(value) => onKrLinkStatusChange(value as KpiKrLinkStatus | "all")}
        >
          <SelectTrigger className="w-[180px]">
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
          triggerClassName="w-[180px]"
        />
      )}

      {/* Escopo */}
      {onScopeChange && (
        <Select
          value={scope}
          onValueChange={(value) => onScopeChange(value as KpiScope | "all")}
        >
          <SelectTrigger className="w-[160px]">
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
        triggerClassName="w-[200px]"
      />
    </div>
  );
}
