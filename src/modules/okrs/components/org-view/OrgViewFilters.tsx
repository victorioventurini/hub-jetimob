import { StatusSelect, TeamSelect } from '@/components/selects';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export type StatusFilter = 'all' | 'green' | 'yellow' | 'red' | 'not_started';
export type TeamFilter = string;

interface OrgViewFiltersProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  teamFilter: TeamFilter;
  onTeamFilterChange: (value: TeamFilter) => void;
}

export function OrgViewFilters({
  statusFilter,
  onStatusFilterChange,
  teamFilter,
  onTeamFilterChange,
}: OrgViewFiltersProps) {
  const hasActiveFilters = statusFilter !== 'all' || teamFilter !== 'all';

  const clearFilters = () => {
    onStatusFilterChange('all');
    onTeamFilterChange('all');
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusSelect
        value={statusFilter}
        onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
        variant="rag"
        triggerClassName="w-[160px]"
      />

      <TeamSelect
        value={teamFilter === 'all' ? undefined : teamFilter}
        onValueChange={(value) => onTeamFilterChange(value ?? 'all')}
        includeAll
        allLabel="Todos os times"
        placeholder="Filtrar por time"
        triggerClassName="w-[180px]"
      />

      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
          className="text-muted-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
