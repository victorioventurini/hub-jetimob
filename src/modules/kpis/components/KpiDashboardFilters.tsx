import { TeamSelect, CategorySelect, CategoryOption, AreaSelect } from "@/components/selects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCategory, KpiScope, CATEGORY_LABELS, SCOPE_LABELS } from "../types";

interface KpiDashboardFiltersProps {
  category: KpiCategory | "all";
  teamId: string | "all";
  areaId?: string | "all";
  scope?: KpiScope | "all";
  onCategoryChange: (category: KpiCategory | "all") => void;
  onTeamChange: (teamId: string | "all") => void;
  onAreaChange?: (areaId: string | "all") => void;
  onScopeChange?: (scope: KpiScope | "all") => void;
}

const categoryOptions: CategoryOption[] = (Object.keys(CATEGORY_LABELS) as KpiCategory[]).map(
  (cat) => ({
    value: cat,
    label: CATEGORY_LABELS[cat],
  })
);

export function KpiDashboardFilters({
  category,
  teamId,
  areaId = "all",
  scope = "all",
  onCategoryChange,
  onTeamChange,
  onAreaChange,
  onScopeChange,
}: KpiDashboardFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <CategorySelect
        value={category}
        onValueChange={(value) => onCategoryChange(value as KpiCategory | "all")}
        options={categoryOptions}
        placeholder="Categoria"
        includeAll
        allLabel="Todas categorias"
        triggerClassName="w-[180px]"
      />

      {onAreaChange && (
        <AreaSelect
          value={areaId === "all" ? undefined : areaId}
          onValueChange={(value) => onAreaChange(value ?? "all")}
          includeAll
          allLabel="Todas as áreas"
          triggerClassName="w-[180px]"
        />
      )}

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
