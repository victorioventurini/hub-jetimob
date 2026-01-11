/**
 * CycleCheckinsFilters - Barra de filtros para a página de check-ins
 * 
 * Usa componentes canônicos de seleção e UrlSearchInput.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { UrlSearchInput } from '@/shared/filters';
import { TeamSelect, StatusSelect } from '@/components/selects';
import { useManageableTeamsFlat } from '../../hooks/useManageableTeams';

// Confidence options for the filter
const CONFIDENCE_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'high', label: 'Alta', color: 'bg-emerald-500' },
  { value: 'medium', label: 'Média', color: 'bg-amber-500' },
  { value: 'low', label: 'Baixa', color: 'bg-red-500' },
];

// RAG status options for the filter
const RAG_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'green', label: 'No caminho', color: 'bg-emerald-500' },
  { value: 'yellow', label: 'Em risco', color: 'bg-amber-500' },
  { value: 'red', label: 'Atrasado', color: 'bg-red-500' },
];

interface FiltersState {
  teamId: string;
  ownerId: string;
  confidence: string;
  ragStatus: string;
  dateFrom: string;
  dateTo: string;
  onlyOverdue: boolean;
  search: string;
  page: number;
  pageSize: number;
}

interface CycleCheckinsFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: Partial<FiltersState>) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function CycleCheckinsFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters,
}: CycleCheckinsFiltersProps) {
  const { teams: manageableTeams, isLoading: teamsLoading } = useManageableTeamsFlat();
  
  // Count active filters (excluding defaults)
  const activeFilterCount = [
    filters.teamId,
    filters.ownerId,
    filters.confidence !== 'all' && filters.confidence,
    filters.ragStatus !== 'all' && filters.ragStatus,
    filters.dateFrom,
    filters.dateTo,
    filters.onlyOverdue,
    filters.search,
  ].filter(Boolean).length;
  
  return (
    <div className="space-y-4">
      {/* Search & Main Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <UrlSearchInput
          value={filters.search}
          onChange={(v) => onFiltersChange({ search: v })}
          placeholder="Buscar KR ou Objetivo..."
          className="flex-1"
          debounceMs={300}
        />
        
        {/* Team Filter - using canonical TeamSelect */}
        <TeamSelect
          value={filters.teamId || undefined}
          onValueChange={(v) => onFiltersChange({ teamId: v ?? '' })}
          placeholder="Todos os times"
          includeAll
          allLabel="Todos os times"
          teams={manageableTeams}
          triggerClassName="w-full sm:w-48"
        />
        
        {/* Confidence Filter - using canonical StatusSelect */}
        <StatusSelect
          value={filters.confidence}
          onValueChange={(v) => onFiltersChange({ confidence: v })}
          variant="custom"
          options={CONFIDENCE_OPTIONS}
          triggerClassName="w-full sm:w-36"
        />
        
        {/* RAG Status Filter - using canonical StatusSelect */}
        <StatusSelect
          value={filters.ragStatus}
          onValueChange={(v) => onFiltersChange({ ragStatus: v })}
          variant="custom"
          options={RAG_OPTIONS}
          triggerClassName="w-full sm:w-36"
        />
        
        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1.5"
          >
            <X className="h-4 w-4" />
            Limpar
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
