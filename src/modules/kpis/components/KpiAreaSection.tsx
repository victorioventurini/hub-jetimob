import { KpiWithValues } from "../types";
import { KpiCard } from "./KpiCard";
import { cn } from "@/lib/utils";

/**
 * v2.82.0 - Seção de KPIs agrupados por Área
 * 
 * Substituiu KpiCategorySection para agrupar por Área estratégica
 * em vez de Categoria funcional (deprecated).
 */

interface KpiAreaSectionProps {
  areaId: string | null;
  areaName: string;
  areaColor: string | null;
  kpis: KpiWithValues[];
  onKpiClick?: (kpi: KpiWithValues) => void;
}

export function KpiAreaSection({ 
  areaId, 
  areaName, 
  areaColor, 
  kpis, 
  onKpiClick 
}: KpiAreaSectionProps) {
  if (kpis.length === 0) return null;

  // Default color if none provided
  const colorClass = areaColor || "bg-muted";

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div 
          className={cn("w-1 h-6 rounded-full", !areaColor && "bg-muted")}
          style={areaColor ? { backgroundColor: areaColor } : undefined}
        />
        <h2 className="text-lg font-semibold text-foreground">
          {areaName}
        </h2>
        <span className="text-sm text-muted-foreground">
          ({kpis.length} {kpis.length === 1 ? "indicador" : "indicadores"})
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
