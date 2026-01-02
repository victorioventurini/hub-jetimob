import { KpiWithValues, KpiCategory, CATEGORY_LABELS, CATEGORY_COLORS } from "../types";
import { KpiCard } from "./KpiCard";
import { cn } from "@/lib/utils";

interface KpiCategorySectionProps {
  category: KpiCategory;
  kpis: KpiWithValues[];
  onKpiClick?: (kpi: KpiWithValues) => void;
}

export function KpiCategorySection({ category, kpis, onKpiClick }: KpiCategorySectionProps) {
  if (kpis.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-1 h-6 rounded-full", CATEGORY_COLORS[category])} />
        <h2 className="text-lg font-semibold text-foreground">
          {CATEGORY_LABELS[category]}
        </h2>
        <span className="text-sm text-muted-foreground">
          ({kpis.length} {kpis.length === 1 ? "indicador" : "indicadores"})
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            kpi={kpi}
            onClick={() => onKpiClick?.(kpi)}
          />
        ))}
      </div>
    </section>
  );
}
