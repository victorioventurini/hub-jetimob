import { TeamSelect, AreaSelect } from "@/components/selects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCategory, KpiScope, SCOPE_LABELS } from "../types";

/**
 * v2.82.0 - Filtros do Dashboard de Indicadores
 * 
 * Mudanças:
 * - Categoria removida (deprecated) - usa Área como ownership
 * - Adicionado filtro de Escopo
 * - Filtro de Área agora é primário
 */

interface KpiDashboardFiltersProps {
  /** @deprecated v2.82.0 - Use areaId */
  category: KpiCategory | "all";
  teamId: string | "all";
  areaId?: string | "all";
  scope?: KpiScope | "all";
  /** @deprecated v2.82.0 - Category filter is no longer used */
  onCategoryChange: (category: KpiCategory | "all") => void;
  onTeamChange: (teamId: string | "all") => void;
  onAreaChange?: (areaId: string | "all") => void;
  onScopeChange?: (scope: KpiScope | "all") => void;
}

export function KpiDashboardFilters({
  teamId,
  areaId = "all",
  scope = "all",
  onTeamChange,
  onAreaChange,
  onScopeChange,
}: KpiDashboardFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Área - primary filter */}
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
            {(Object.keys(SCOPE_LABELS) as KpiScope[]).map((sc) => (
              <SelectItem key={sc} value={sc}>
                {SCOPE_LABELS[sc]}
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
