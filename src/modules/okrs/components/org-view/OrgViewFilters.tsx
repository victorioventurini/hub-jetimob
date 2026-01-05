import { StatusSelect, RAG_STATUS_OPTIONS } from '@/components/selects';
import { TeamSelect } from '@/components/selects';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { FlatTeamItem } from '@/modules/teams/hooks/useTeams';

export type StatusFilter = 'all' | 'green' | 'yellow' | 'red' | 'not_started';
export type TeamFilter = string;

interface OrgViewFiltersProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  teamFilter: TeamFilter;
  onTeamFilterChange: (value: TeamFilter) => void;
  availableTeams: { id: string; name: string }[];
}

export function OrgViewFilters({
  statusFilter,
  onStatusFilterChange,
  teamFilter,
  onTeamFilterChange,
  availableTeams,
}: OrgViewFiltersProps) {
  const hasActiveFilters = statusFilter !== 'all' || teamFilter !== 'all';

  const clearFilters = () => {
    onStatusFilterChange('all');
    onTeamFilterChange('all');
  };

  // Convert availableTeams to FlatTeamItem format for TeamSelect
  const teamsAsFlatItems: FlatTeamItem[] = availableTeams.map((team) => ({
    id: team.id,
    name: team.name,
    level: 0,
    parentId: null,
  }));

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
        teams={teamsAsFlatItems}
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
