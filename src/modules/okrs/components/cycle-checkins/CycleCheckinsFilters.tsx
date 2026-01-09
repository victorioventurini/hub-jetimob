/**
 * CycleCheckinsFilters - Barra de filtros para a página de check-ins
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  X, 
  Filter,
  Users,
} from 'lucide-react';
import { useManageableTeamsFlat } from '../../hooks/useManageableTeams';
import { cn } from '@/lib/utils';

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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar KR ou Objetivo..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-9"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onFiltersChange({ search: '' })}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Team Filter */}
        <Select
          value={filters.teamId || 'all'}
          onValueChange={(v) => onFiltersChange({ teamId: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Todos os times" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os times</SelectItem>
            {manageableTeams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                <span style={{ paddingLeft: `${team.level * 12}px` }}>
                  {team.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Confidence Filter */}
        <Select
          value={filters.confidence}
          onValueChange={(v) => onFiltersChange({ confidence: v })}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Confiança" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Status Filter */}
        <Select
          value={filters.ragStatus}
          onValueChange={(v) => onFiltersChange({ ragStatus: v })}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="green">No caminho</SelectItem>
            <SelectItem value="yellow">Em risco</SelectItem>
            <SelectItem value="red">Atrasado</SelectItem>
          </SelectContent>
        </Select>
        
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
