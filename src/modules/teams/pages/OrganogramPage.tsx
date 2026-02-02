/**
 * OrganogramPage - Página do organograma interativo
 * 
 * Exibe a estrutura hierárquica da organização:
 * CEO → Áreas → Times → Subtimes → Squads → Membros
 * 
 * URL State: searchTerm, showMembers, showSquads são persistidos na URL
 */
import { useState, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Network, ArrowLeft, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { OrganogramChart, OrganogramControls } from "../components/organogram";
import { useOrganogramData } from "../hooks";
import { OrganogramFilters, OrganogramControlsState } from "../types/organogram";
import { organogramToText } from "../utils/organogramToText";
import { useBu } from "@/contexts/BuContext";
import { useUrlState, useUrlSearch } from "@/shared/url";

export default function OrganogramPage() {
  const { currentBu } = useBu();
  const { data, isLoading, error } = useOrganogramData();
  const [searchParams] = useSearchParams();
  const isFullscreen = searchParams.get("fullscreen") === "true";

  // URL State for filters - persisted across refresh and shareable
  const { value: searchTerm, set: setSearchTerm } = useUrlSearch("q", 300);
  const { value: showMembersParam, set: setShowMembersParam } = useUrlState<string>({ 
    key: "members", 
    defaultValue: "true" 
  });
  const { value: showSquadsParam, set: setShowSquadsParam } = useUrlState<string>({ 
    key: "squads", 
    defaultValue: "false" 
  });

  // Convert URL params to boolean
  const showMembers = showMembersParam === "true";
  const showSquads = showSquadsParam === "true";

  // Memoized filters object for child components
  const filters: OrganogramFilters = useMemo(() => ({
    showMembers,
    showSquads,
    searchTerm: searchTerm || "",
  }), [showMembers, showSquads, searchTerm]);

  // Handler for filter changes from controls
  const handleFiltersChange = useCallback((newFilters: OrganogramFilters) => {
    if (newFilters.searchTerm !== filters.searchTerm) {
      setSearchTerm(newFilters.searchTerm);
    }
    if (newFilters.showMembers !== filters.showMembers) {
      setShowMembersParam(newFilters.showMembers ? "true" : "false");
    }
    if (newFilters.showSquads !== filters.showSquads) {
      setShowSquadsParam(newFilters.showSquads ? "true" : "false");
    }
  }, [filters, setSearchTerm, setShowMembersParam, setShowSquadsParam]);

  // Controls state - start at 100% for best fit, default expansion mode
  const [controls, setControls] = useState<OrganogramControlsState>({
    zoom: 100,
    orientation: "vertical",
    expansionKey: 0,
    expansionMode: "default",
  });

  const handleFitToScreen = useCallback(() => {
    setControls(prev => ({ ...prev, zoom: 100 }));
  }, []);

  const handleOpenFullscreen = useCallback(() => {
    window.open("/teams/org-chart?fullscreen=true", "_blank");
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    window.close();
  }, []);

  const handleExportText = useCallback(() => {
    if (!data) return;
    
    const text = organogramToText(data, filters, currentBu?.name || 'BU');
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Organograma copiado!", {
        description: "Cole em qualquer lugar para análise."
      });
    }).catch(() => {
      toast.error("Erro ao copiar", {
        description: "Não foi possível acessar a área de transferência."
      });
    });
  }, [data, filters, currentBu?.name]);

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

  // Fullscreen mode - minimal UI, maximum chart space
  if (isFullscreen) {
    return (
      <>
        <Helmet>
          <title>Organograma | Hub Jetimob</title>
          <meta 
            name="description" 
            content="Visualize a estrutura organizacional da empresa com áreas, times, squads e membros." 
          />
        </Helmet>

        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Minimal header */}
          <div className="flex items-center justify-between p-4 border-b bg-card">
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-primary" />
              <span className="font-semibold">Organograma - {currentBu?.name || 'BU'}</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Compact controls */}
              <OrganogramControls
                filters={filters}
                onFiltersChange={handleFiltersChange}
                controls={controls}
                onControlsChange={setControls}
                onFitToScreen={handleFitToScreen}
                onOpenFullscreen={handleOpenFullscreen}
                onExportText={handleExportText}
                compact
              />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseFullscreen}
                className="ml-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Full chart area */}
          <div className="flex-1 overflow-hidden bg-muted/30">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Skeleton className="w-48 h-16 rounded-lg" />
                <div className="flex gap-8">
                  <Skeleton className="w-40 h-14 rounded-lg" />
                  <Skeleton className="w-40 h-14 rounded-lg" />
                  <Skeleton className="w-40 h-14 rounded-lg" />
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
          onFiltersChange={handleFiltersChange}
          controls={controls}
          onControlsChange={setControls}
          onFitToScreen={handleFitToScreen}
          onOpenFullscreen={handleOpenFullscreen}
          onExportText={handleExportText}
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
