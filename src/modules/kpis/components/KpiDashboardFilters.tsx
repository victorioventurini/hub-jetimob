import { TeamSelect } from "@/components/selects";
import { CategorySelect, CategoryOption } from "@/components/selects";
import { KpiCategory, CATEGORY_LABELS } from "../types";

interface KpiDashboardFiltersProps {
  category: KpiCategory | "all";
  teamId: string | "all";
  onCategoryChange: (category: KpiCategory | "all") => void;
  onTeamChange: (teamId: string | "all") => void;
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
  onCategoryChange,
  onTeamChange,
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
