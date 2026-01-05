import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamContributionFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function TeamContributionFilters({
  statusFilter,
  onStatusFilterChange,
}: TeamContributionFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="on_track">On Track</SelectItem>
          <SelectItem value="at_risk">Em Risco</SelectItem>
          <SelectItem value="off_track">Off Track</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
