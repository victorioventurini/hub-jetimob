import { StatusSelect } from '@/components/selects';

interface TeamContributionFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'on_track', label: 'On Track', color: 'bg-emerald-500' },
  { value: 'at_risk', label: 'Em Risco', color: 'bg-amber-500' },
  { value: 'off_track', label: 'Off Track', color: 'bg-red-500' },
];

export function TeamContributionFilters({
  statusFilter,
  onStatusFilterChange,
}: TeamContributionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusSelect
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        variant="custom"
        options={STATUS_OPTIONS}
        triggerClassName="w-[160px]"
      />
    </div>
  );
}
