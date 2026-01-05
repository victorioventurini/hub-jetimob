import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type StatusFilter = 'all' | 'green' | 'yellow' | 'red' | 'not_started';
export type TeamFilter = string;

interface OrgViewFiltersProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  teamFilter: TeamFilter;
  onTeamFilterChange: (value: TeamFilter) => void;
  availableTeams: { id: string; name: string }[];
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'green', label: 'On Track' },
  { value: 'yellow', label: 'Atenção' },
  { value: 'red', label: 'Em Risco' },
  { value: 'not_started', label: 'Não Iniciado' },
];

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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={teamFilter} onValueChange={onTeamFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os times</SelectItem>
          {availableTeams.map(team => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
