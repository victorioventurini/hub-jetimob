import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, type OkrCalculatedStatus } from "../../hooks";
import { YearSelect, TeamSelect } from '@/components/selects';
import type { FlatTeamItem } from '@/modules/teams/hooks';

interface Team {
  id: string;
  name: string;
  parent_team_id?: string | null;
}

interface OkrFilters {
  year: number;
  teamId?: string;
  parentTeamId?: string;
  statuses: OkrCalculatedStatus[];
  sharedFilter?: 'all' | 'shared' | 'exclusive';
  primaryTeamId?: string;      // Filter by primary team (for shared OKRs)
  contributorTeamId?: string;  // Filter by contributing team
}

interface OkrDashboardFiltersProps {
  filters: OkrFilters;
  onFiltersChange: (filters: OkrFilters) => void;
  teams: Team[];
  years: number[];
  showSharedFilter?: boolean;
}

const STATUS_OPTIONS: OkrCalculatedStatus[] = ['on_track', 'at_risk', 'off_track', 'not_started', 'completed'];

const SHARED_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'shared', label: 'Compartilhadas' },
  { value: 'exclusive', label: 'Exclusivas' },
];

export function OkrDashboardFilters({
  filters,
  onFiltersChange,
  teams,
  years,
  showSharedFilter = true,
}: OkrDashboardFiltersProps) {
  const activeFilterCount = [
    filters.teamId,
    filters.parentTeamId,
    filters.statuses.length < STATUS_OPTIONS.length && filters.statuses.length > 0,
    filters.sharedFilter && filters.sharedFilter !== 'all',
    filters.primaryTeamId,
    filters.contributorTeamId,
  ].filter(Boolean).length;

  const handleStatusToggle = (status: OkrCalculatedStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const clearFilters = () => {
    onFiltersChange({
      year: filters.year,
      teamId: undefined,
      parentTeamId: undefined,
      statuses: [],
      sharedFilter: 'all',
      primaryTeamId: undefined,
      contributorTeamId: undefined,
    });
  };

  // Convert teams to FlatTeamItem format with hierarchy
  const buildHierarchicalList = (teams: Team[]): FlatTeamItem[] => {
    const parentTeams = teams.filter(t => !t.parent_team_id);
    const childTeamsMap = new Map<string, Team[]>();
    
    teams.forEach(team => {
      if (team.parent_team_id) {
        const children = childTeamsMap.get(team.parent_team_id) || [];
        children.push(team);
        childTeamsMap.set(team.parent_team_id, children);
      }
    });

    const result: FlatTeamItem[] = [];
    
    parentTeams.forEach(parent => {
      result.push({ id: parent.id, name: parent.name, level: 0, parentId: null });
      const children = childTeamsMap.get(parent.id) || [];
      children.forEach(child => {
        result.push({ id: child.id, name: child.name, level: 1, parentId: parent.id });
      });
    });

    return result;
  };

  const hierarchicalTeams = buildHierarchicalList(teams);

  return (
    <div className="flex items-center gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
      {/* Year selector */}
      <YearSelect
        value={filters.year}
        onValueChange={(year) => onFiltersChange({ ...filters, year })}
        years={years}
        triggerClassName="w-[90px] sm:w-[100px]"
      />

      {/* Team filter */}
      <TeamSelect
        value={filters.teamId}
        onValueChange={(value) => onFiltersChange({ ...filters, teamId: value })}
        teams={hierarchicalTeams}
        includeAll
        allLabel="Todos os times"
        triggerClassName="w-[140px] sm:w-[180px]"
      />

      {/* Shared/Exclusive filter */}
      {showSharedFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "gap-2",
                filters.sharedFilter && filters.sharedFilter !== 'all' && "border-status-purple text-status-purple"
              )}
            >
              <Users className="w-4 h-4" />
              {filters.sharedFilter === 'shared' ? 'Compartilhadas' : 
               filters.sharedFilter === 'exclusive' ? 'Exclusivas' : 'Tipo'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48">
            <div className="space-y-2">
              <p className="text-sm font-medium mb-2">Tipo de OKR</p>
              {SHARED_FILTER_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors",
                    filters.sharedFilter === option.value && "bg-muted"
                  )}
                  onClick={() => onFiltersChange({ 
                    ...filters, 
                    sharedFilter: option.value as 'all' | 'shared' | 'exclusive' 
                  })}
                >
                  <div className={cn(
                    "w-3 h-3 rounded-full border",
                    filters.sharedFilter === option.value 
                      ? "bg-primary border-primary" 
                      : "border-muted-foreground"
                  )} />
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Status filter popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "gap-2",
              filters.statuses.length > 0 && "border-primary"
            )}
          >
            <Filter className="w-4 h-4" />
            Status
            {filters.statuses.length > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                {filters.statuses.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56">
          <div className="space-y-3">
            <p className="text-sm font-medium">Filtrar por Status</p>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => {
                const config = STATUS_CONFIG[status];
                const isChecked = filters.statuses.length === 0 || filters.statuses.includes(status);
                
                return (
                  <div key={status} className="flex items-center gap-2">
                    <Checkbox
                      id={status}
                      checked={isChecked}
                      onCheckedChange={() => handleStatusToggle(status)}
                    />
                    <Label 
                      htmlFor={status} 
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <div className={cn("w-2.5 h-2.5 rounded-full", config.bgColor)} />
                      {config.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
          Limpar
        </Button>
      )}
    </div>
  );
}
