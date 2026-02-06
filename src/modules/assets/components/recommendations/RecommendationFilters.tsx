/**
 * RecommendationFilters
 * 
 * Filter controls for recommendations list.
 */

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { MultiTeamSelect } from "@/components/selects/MultiTeamSelect";
import { MultiJobTitleSelect } from "@/components/selects/MultiJobTitleSelect";
import { AssetCategorySelect } from "../selects/AssetCategorySelect";
import type { RecommendationFilters as Filters } from "../../hooks";
import { 
  RECOMMENDATION_STATUS_LABELS, 
  RECOMMENDATION_REVIEW_STATUS_LABELS,
  type RecommendationStatus,
  type RecommendationReviewStatus,
} from "../../types";

interface RecommendationFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function RecommendationFilters({
  filters,
  onFiltersChange,
}: RecommendationFiltersProps) {
  const hasFilters = !!(
    filters.search ||
    filters.categoryId ||
    filters.teamId ||
    filters.jobTitleId ||
    filters.reviewStatus ||
    (filters.status && filters.status !== 'active')
  );

  const handleClear = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar recomendação..."
          value={filters.search || ""}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      {/* Category/Subcategory filter - hierarchical */}
      <div className="w-[200px]">
        <AssetCategorySelect
          value={filters.categoryId}
          onValueChange={(val) => onFiltersChange({ ...filters, categoryId: val })}
          placeholder="Categoria"
          noneLabel="Todas categorias"
          triggerClassName="w-full"
        />
      </div>

      {/* Team filter */}
      <div className="w-[200px]">
        <MultiTeamSelect
          value={filters.teamId ? [filters.teamId] : []}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, teamId: value[0] || undefined })
          }
          placeholder="Filtrar por time"
        />
      </div>

      {/* Job Title filter */}
      <div className="w-[200px]">
        <MultiJobTitleSelect
          value={filters.jobTitleId ? [filters.jobTitleId] : []}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, jobTitleId: value[0] || undefined })
          }
          placeholder="Filtrar por cargo"
        />
      </div>

      {/* Review Status */}
      <Select
        value={filters.reviewStatus || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            reviewStatus: value === "all" ? undefined : (value as RecommendationReviewStatus),
          })
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status revisão" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {Object.entries(RECOMMENDATION_REVIEW_STATUS_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status || "active"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status: value as RecommendationStatus,
          })
        }
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(RECOMMENDATION_STATUS_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
