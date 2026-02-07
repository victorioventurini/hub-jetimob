/**
 * RecommendationSelectStep
 * 
 * Optional first step in inventory form to select a recommendation.
 * Provides pre-filled values when a recommendation is selected.
 * Includes inline team/job title filters for discovery.
 */

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Lightbulb, SkipForward } from "lucide-react";
import { MultiTeamSelect } from "@/components/selects/MultiTeamSelect";
import { MultiJobTitleSelect } from "@/components/selects/MultiJobTitleSelect";
import { RecommendationCard } from "./RecommendationCard";
import { useRecommendations } from "../../hooks";
import { 
  filterAndRankRecommendations, 
  groupRecommendationsByScope 
} from "../../lib/recommendationUtils";
import type { AssetRecommendation } from "../../types";

interface RecommendationSelectStepProps {
  onSelect: (recommendation: AssetRecommendation) => void;
  onSkip: () => void;
  /** Optional: pre-filter by category */
  categoryId?: string;
}

export function RecommendationSelectStep({
  onSelect,
  onSkip,
  categoryId,
}: RecommendationSelectStepProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTeamId, setFilterTeamId] = useState<string | undefined>();
  const [filterJobTitleId, setFilterJobTitleId] = useState<string | undefined>();

  const { recommendations, isLoading } = useRecommendations({
    status: "active",
    categoryId,
  });

  // Filter by search and rank by relevance using selected team/job title
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Text search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchLower) ||
          r.brand.toLowerCase().includes(searchLower) ||
          (r.model && r.model.toLowerCase().includes(searchLower))
      );
    }

    return filterAndRankRecommendations(filtered, undefined, filterTeamId, filterJobTitleId);
  }, [recommendations, search, filterTeamId, filterJobTitleId]);

  // Group by scope for display
  const { byJobTitle, byTeam, global } = useMemo(
    () => groupRecommendationsByScope(filteredRecommendations, filterTeamId, filterJobTitleId),
    [filteredRecommendations, filterTeamId, filterJobTitleId]
  );

  const handleSelect = (rec: AssetRecommendation) => {
    if (selectedId === rec.id) {
      onSelect(rec);
    } else {
      setSelectedId(rec.id);
    }
  };

  const hasRecommendations = filteredRecommendations.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lightbulb className="h-5 w-5" />
        <span className="text-sm">
          Começar com uma recomendação preencherá automaticamente categoria, marca e modelo.
        </span>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar recomendação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-[180px]">
          <MultiTeamSelect
            value={filterTeamId ? [filterTeamId] : []}
            onValueChange={(v) => setFilterTeamId(v[0] || undefined)}
            placeholder="Filtrar por time"
          />
        </div>
        <div className="w-[180px]">
          <MultiJobTitleSelect
            value={filterJobTitleId ? [filterJobTitleId] : []}
            onValueChange={(v) => setFilterJobTitleId(v[0] || undefined)}
            placeholder="Filtrar por cargo"
          />
        </div>
      </div>

      {/* Recommendations list */}
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando recomendações...
            </div>
          ) : !hasRecommendations ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma recomendação encontrada</p>
              <p className="text-sm mt-1">
                {search ? "Tente outro termo de busca" : "Cadastre uma recomendação primeiro"}
              </p>
            </div>
          ) : (
            <>
              {/* By Job Title (highest priority) */}
              {byJobTitle.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    🏆 Recomendado para o cargo
                  </h4>
                  {byJobTitle.map((rec) => (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      onSelect={handleSelect}
                      isSelected={selectedId === rec.id}
                    />
                  ))}
                </div>
              )}

              {/* By Team */}
              {byTeam.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {byJobTitle.length > 0 ? "Outras opções do time" : "Recomendações do time"}
                  </h4>
                  {byTeam.map((rec) => (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      onSelect={handleSelect}
                      isSelected={selectedId === rec.id}
                    />
                  ))}
                </div>
              )}

              {/* Global */}
              {global.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Recomendações gerais
                  </h4>
                  {global.map((rec) => (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      onSelect={handleSelect}
                      isSelected={selectedId === rec.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onSkip}>
          <SkipForward className="h-4 w-4 mr-2" />
          Pular - cadastrar sem recomendação
        </Button>

        {selectedId && (
          <Button
            onClick={() => {
              const rec = filteredRecommendations.find((r) => r.id === selectedId);
              if (rec) onSelect(rec);
            }}
          >
            Continuar com selecionado
          </Button>
        )}
      </div>
    </div>
  );
}