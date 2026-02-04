import { TeamSelect, AreaSelect } from "@/components/selects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCategory, KpiScope, KpiIndicatorType, KpiRagStatus, getScopeLabels, INDICATOR_TYPE_LABELS, RAG_STATUS_CONFIG } from "../types";
import { useBu } from "@/contexts/BuContext";

/**
 * v2.87.0 - Filtros do Dashboard de Indicadores
 * 
 * Mudanças:
 * - v2.83.0: Categoria removida (deprecated) - usa Área como ownership
 * - v2.83.0: Adicionado filtro de Escopo
 * - v2.83.0: Adicionado filtro de Tipo de Indicador (KPI/Métrica)
 * - v2.87.0: Adicionado filtro de Status (RAG)
 */

interface KpiDashboardFiltersProps {
  /** @deprecated v2.82.0 - Use areaId */
  category: KpiCategory | "all";
  teamId: string | "all";
  areaId?: string | "all";
  scope?: KpiScope | "all";
  indicatorType?: KpiIndicatorType | "all";
  ragStatus?: KpiRagStatus | "all";
  /** @deprecated v2.82.0 - Category filter is no longer used */
  onCategoryChange: (category: KpiCategory | "all") => void;
  onTeamChange: (teamId: string | "all") => void;
  onAreaChange?: (areaId: string | "all") => void;
  onScopeChange?: (scope: KpiScope | "all") => void;
  onIndicatorTypeChange?: (type: KpiIndicatorType | "all") => void;
  onRagStatusChange?: (status: KpiRagStatus | "all") => void;
}

export function KpiDashboardFilters({
  teamId,
  areaId = "all",
  scope = "all",
  indicatorType = "all",
  ragStatus = "all",
  onTeamChange,
  onAreaChange,
  onScopeChange,
  onIndicatorTypeChange,
  onRagStatusChange,
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
            <SelectItem value="all">Todos tipos</SelectItem>
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
            <SelectItem value="all">Todos status</SelectItem>
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
            <SelectItem value="all">Todos escopos</SelectItem>
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
