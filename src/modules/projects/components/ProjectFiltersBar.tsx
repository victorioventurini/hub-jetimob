import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { ProjectFilters, ProjectStatus } from '../types';

interface ProjectFiltersBarProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
}

const statusOptions: Array<{ value: ProjectStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'planned', label: 'Planejado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'paused', label: 'Pausado' },
  { value: 'done', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function ProjectFiltersBar({ filters, onFiltersChange }: ProjectFiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar projetos..."
          value={filters.search ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status ?? 'all'}
        onValueChange={(v) => onFiltersChange({ ...filters, status: v as ProjectStatus | 'all' })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
