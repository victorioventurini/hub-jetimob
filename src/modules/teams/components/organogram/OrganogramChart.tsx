/**
 * OrganogramChart - Container principal do organograma
 * 
 * Layout: CEO no topo com avatar circular, 3 áreas sempre em linha horizontal
 */
import { useRef, useMemo, useEffect } from "react";
import { OrganogramNodeWrapper } from "./OrganogramNode";
import { OrganogramData, OrganogramFilters, OrganogramControlsState, OrganogramNode } from "../../types/organogram";
import { cn } from "@/lib/utils";

interface OrganogramChartProps {
  data: OrganogramData;
  filters: OrganogramFilters;
  controls: OrganogramControlsState;
  onControlsChange?: (controls: OrganogramControlsState) => void;
}

export function OrganogramChart({ data, filters, controls, onControlsChange }: OrganogramChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitializedZoom = useRef(false);

  // Auto-fit zoom on first load to ensure all areas are visible
  useEffect(() => {
    if (!hasInitializedZoom.current && data && onControlsChange) {
      // Calculate zoom to fit all content (3 areas in row)
      const initialZoom = 70; // Start at 70% to ensure 3 areas fit
      onControlsChange({ ...controls, zoom: initialZoom });
      hasInitializedZoom.current = true;
    }
  }, [data, onControlsChange]);

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

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-auto p-8 min-h-[500px]",
        "flex justify-center"
      )}
      style={{
        transform: `scale(${controls.zoom / 100})`,
        transformOrigin: 'top center',
      }}
    >
      <div className="inline-flex flex-col items-center">
        {/* Render CEO at top with areas as children */}
        {filteredData.ceo ? (
          <OrganogramNodeWrapper node={filteredData.ceo} defaultExpanded />
        ) : (
          /* Render areas without CEO - always in horizontal row */
          <div className="flex flex-nowrap justify-center gap-8">
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
  );
}
