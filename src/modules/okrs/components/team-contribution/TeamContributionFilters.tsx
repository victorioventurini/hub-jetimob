import { StatusSelect } from '@/components/selects';

interface TeamContributionFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'on_track', label: 'No Caminho', color: 'bg-status-green' },
  { value: 'at_risk', label: 'Em Risco', color: 'bg-status-yellow' },
  { value: 'off_track', label: 'Fora do Caminho', color: 'bg-status-red' },
];

export function TeamContributionFilters({
  statusFilter,
  onStatusFilterChange,
}: TeamContributionFiltersProps) {
  return (
    <StatusSelect
      value={statusFilter}
      onValueChange={onStatusFilterChange}
      variant="custom"
      options={STATUS_OPTIONS}
      triggerClassName="w-[160px]"
    />
  );
}
