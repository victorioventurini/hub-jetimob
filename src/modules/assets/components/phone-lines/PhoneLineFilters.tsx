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
import type { PhoneLineStatus } from "../../hooks/usePhoneLines";

interface PhoneLineFiltersProps {
  statusFilter: PhoneLineStatus | "all";
  onStatusChange: (value: PhoneLineStatus | "all") => void;
  carrierFilter: string;
  onCarrierChange: (value: string) => void;
  carriers: string[];
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
    </>
  );
}
