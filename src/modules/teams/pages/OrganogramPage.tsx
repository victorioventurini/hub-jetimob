/**
 * OrganogramPage - Página do organograma interativo
 * 
 * Exibe a estrutura hierárquica da organização:
 * CEO → Áreas → Times → Subtimes → Squads → Membros
 */
import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Network, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { OrganogramChart, OrganogramControls } from "../components/organogram";
import { useOrganogramData } from "../hooks/useOrganogramData";
import { OrganogramFilters, OrganogramControlsState } from "../types/organogram";
import { useBu } from "@/contexts/BuContext";

export default function OrganogramPage() {
  const { currentBu } = useBu();
  const { data, isLoading, error } = useOrganogramData();

  // Filters state - start with members visible, squads hidden
  const [filters, setFilters] = useState<OrganogramFilters>({
    showMembers: true,
    showSquads: false,
    searchTerm: "",
  });

  // Controls state - start at 100% for best fit
  const [controls, setControls] = useState<OrganogramControlsState>({
    zoom: 100,
    orientation: "vertical",
  });

  const handleFitToScreen = useCallback(() => {
    setControls(prev => ({ ...prev, zoom: 100 }));
  }, []);

  const handleOpenFullscreen = useCallback(() => {
    window.open("/organograma?fullscreen=true", "_blank");
  }, []);

  if (error) {
    return (
      <div className="container py-8">
        <PageHeader
          title="Organograma"
          description="Erro ao carregar dados do organograma"
        />
        <div className="mt-8 text-destructive">
          Ocorreu um erro ao carregar os dados. Por favor, tente novamente.
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Organograma | Hub Jetimob</title>
        <meta 
          name="description" 
          content="Visualize a estrutura organizacional da empresa com áreas, times, squads e membros." 
        />
      </Helmet>

      <div className="container py-8 space-y-6">
        {/* Back to Hub button */}
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Hub
          </Link>
        </Button>

        <PageHeader
          title="Organograma"
          description="Visualização hierárquica da estrutura organizacional"
          actions={
            <div className="flex items-center gap-2 text-muted-foreground">
              <Network className="w-5 h-5" />
              <span className="text-sm">Estrutura da {currentBu?.name || 'BU'}</span>
            </div>
          }
        />

        {/* Controls */}
        <OrganogramControls
          filters={filters}
          onFiltersChange={setFilters}
          controls={controls}
          onControlsChange={setControls}
          onFitToScreen={handleFitToScreen}
          onOpenFullscreen={handleOpenFullscreen}
        />

        {/* Chart */}
        <div className="bg-muted/30 rounded-lg border min-h-[600px] overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[600px] gap-4">
              <Skeleton className="w-48 h-16 rounded-lg" />
              <div className="flex gap-8">
                <Skeleton className="w-40 h-14 rounded-lg" />
                <Skeleton className="w-40 h-14 rounded-lg" />
                <Skeleton className="w-40 h-14 rounded-lg" />
              </div>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="w-32 h-12 rounded-lg" />
                ))}
              </div>
            </div>
          ) : data ? (
            <OrganogramChart
              data={data}
              filters={filters}
              controls={controls}
              onControlsChange={setControls}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
