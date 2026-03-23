/**
 * PhoneLineFilters — Inline filters for phone lines listing.
 * Follows InventoryFilters pattern (canonical selects, parent-managed state).
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BuUserSelect } from "@/components/selects/BuUserSelect";
import { TeamSelect } from "@/components/selects/TeamSelect";
import type { PhoneLineStatus } from "../../hooks/usePhoneLines";

interface PhoneLineFiltersProps {
  statusFilter: PhoneLineStatus | "all";
  onStatusChange: (value: PhoneLineStatus | "all") => void;
  carrierFilter: string;
  onCarrierChange: (value: string) => void;
  carriers: string[];
  responsibleUserFilter: string;
  onResponsibleUserChange: (value: string) => void;
  responsibleTeamFilter: string;
  onResponsibleTeamChange: (value: string) => void;
}

const STATUS_OPTIONS: { value: PhoneLineStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "available", label: "Disponível" },
  { value: "loaned", label: "Emprestado" },
];

export function PhoneLineFilters({
  statusFilter,
  onStatusChange,
  carrierFilter,
  onCarrierChange,
  carriers,
  responsibleUserFilter,
  onResponsibleUserChange,
  responsibleTeamFilter,
  onResponsibleTeamChange,
}: PhoneLineFiltersProps) {
  return (
    <>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={carrierFilter} onValueChange={onCarrierChange}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Operadora" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas operadoras</SelectItem>
          {carriers.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Responsible user filter — canonical BuUserSelect */}
      <BuUserSelect
        value={responsibleUserFilter === "all" ? undefined : responsibleUserFilter}
        onValueChange={(val) => onResponsibleUserChange(val ?? "all")}
        placeholder="Todos os responsáveis"
        className="w-[200px]"
        showSearch
        allowNone
        noneLabel="Todos os responsáveis"
        excludeExternal
      />

      {/* Responsible team filter — canonical TeamSelect */}
      <TeamSelect
        value={responsibleTeamFilter === "all" ? undefined : responsibleTeamFilter}
        onValueChange={(val) => onResponsibleTeamChange(val ?? "all")}
        placeholder="Todos os times"
        includeAll
        allLabel="Todos os times"
        triggerClassName="w-[180px] h-9"
      />
    </>
  );
}
