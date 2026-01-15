/**
 * OrganogramChart - Container principal do organograma
 * 
 * Layout: CEO no topo com avatar circular, 3 áreas sempre em linha horizontal
 */
import { useRef, useMemo } from "react";
import { OrganogramNodeWrapper } from "./OrganogramNode";
import { OrganogramData, OrganogramFilters, OrganogramControlsState, OrganogramNode } from "../../types/organogram";
import { cn } from "@/lib/utils";

interface OrganogramChartProps {
  data: OrganogramData;
  filters: OrganogramFilters;
  controls: OrganogramControlsState;
  onControlsChange?: (controls: OrganogramControlsState) => void;
}

export function OrganogramChart({ data, filters, controls }: OrganogramChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter nodes based on filters
  const filteredData = useMemo(() => {
    if (!data.ceo && data.areas.length === 0) {
      return data;
    }

    const filterNode = (node: OrganogramNode): OrganogramNode | null => {
      // Check if node matches search
      const matchesSearch = !filters.searchTerm || 
        node.name.toLowerCase().includes(filters.searchTerm.toLowerCase());

      // Filter children
      let filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is OrganogramNode => child !== null);

      // Apply member/squad filters
      if (!filters.showMembers) {
        filteredChildren = filteredChildren.filter(c => c.type !== 'person');
      }
      if (!filters.showSquads) {
        filteredChildren = filteredChildren.filter(c => c.type !== 'squad');
      }

      // Include node if it matches or has matching children
      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    if (data.ceo) {
      const filteredCeo = filterNode(data.ceo);
      return {
        ceo: filteredCeo,
        areas: [],
      };
    }

    return {
      ceo: null,
      areas: data.areas
        .map(area => filterNode(area))
        .filter((area): area is OrganogramNode => area !== null),
    };
  }, [data, filters]);

  const isEmpty = !filteredData.ceo && filteredData.areas.length === 0;

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Nenhum dado encontrado para exibir no organograma.</p>
      </div>
    );
  }

  const zoomScale = controls.zoom / 100;

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-auto min-h-[500px] w-full"
      )}
    >
      <div 
        className="flex justify-center items-start p-6 min-w-fit"
        style={{
          transform: `scale(${zoomScale})`,
          transformOrigin: 'top center',
          // Adjust container size to prevent unnecessary scroll when zoomed out
          width: zoomScale < 1 ? `${100 / zoomScale}%` : '100%',
        }}
      >
        <div className="inline-flex flex-col items-center">
          {/* Render CEO at top with areas as children */}
          {filteredData.ceo ? (
            <OrganogramNodeWrapper node={filteredData.ceo} defaultExpanded />
          ) : (
            /* Render areas without CEO - always in horizontal row */
            <div className="flex flex-nowrap justify-center gap-6">
              {filteredData.areas.map(area => (
                <OrganogramNodeWrapper 
                  key={area.id} 
                  node={area} 
                  parentColor={area.color}
                  defaultExpanded 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
