/**
 * ProjectFiltersBar — Canonical filter bar for project listings
 * 
 * Uses ListPageFilters + canonical selects (TeamSelect, BuUserSelect, UrlSelect).
 * All filter state lives in URL via parent component.
 */

import { ListPageFilters } from '@/components/ui/list-page-filters';
import { UrlSelect } from '@/shared/filters/UrlSelect';
import { TeamSelect } from '@/components/selects/TeamSelect';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import type { ProjectFilters, ProjectStatus } from '../types';

interface ProjectFiltersBarProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
}

const statusOptions: Array<{ value: string; label: string }> = [
  { value: 'planned', label: 'Planejado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'paused', label: 'Pausado' },
  { value: 'done', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
];

const krLinkOptions: Array<{ value: string; label: string }> = [
  { value: 'linked', label: 'Vinculado a KR' },
  { value: 'not_linked', label: 'Sem KR vinculado' },
];

export function ProjectFiltersBar({ filters, onFiltersChange }: ProjectFiltersBarProps) {
  return (
    <ListPageFilters
      searchValue={filters.search ?? ''}
      onSearchChange={(v) => onFiltersChange({ ...filters, search: v || undefined })}
      searchPlaceholder="Buscar por projeto ou milestone..."
      searchDebounceMs={300}
    >
      {/* Status */}
      <UrlSelect
        value={filters.status ?? 'all'}
        onChange={(v) => onFiltersChange({ ...filters, status: v as ProjectStatus | 'all' })}
        options={statusOptions}
        includeAllOption
        allOptionLabel="Todos os status"
        triggerClassName="w-[170px]"
      />

      {/* Responsável */}
      <BuUserSelect
        value={filters.owner_id || undefined}
        onValueChange={(v) => onFiltersChange({ ...filters, owner_id: v ?? undefined })}
        placeholder="Responsável"
        allowNone={false}
        className="w-[200px]"
      />

      {/* Time */}
      <TeamSelect
        value={filters.team_id || undefined}
        onValueChange={(v) => onFiltersChange({ ...filters, team_id: v ?? undefined })}
        includeAll
        allLabel="Todos os times"
        placeholder="Time"
        triggerClassName="w-[180px]"
      />

      {/* Vinculação a KR */}
      <UrlSelect
        value={
          filters.linked_to_kr === true
            ? 'linked'
            : filters.linked_to_kr === false
              ? 'not_linked'
              : 'all'
        }
        onChange={(v) =>
          onFiltersChange({
            ...filters,
            linked_to_kr: v === 'linked' ? true : v === 'not_linked' ? false : null,
          })
        }
        options={krLinkOptions}
        includeAllOption
        allOptionLabel="KR: Todos"
        triggerClassName="w-[180px]"
      />
    </ListPageFilters>
  );
}
