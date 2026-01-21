import { UrlSearchInput } from "@/shared/filters";
import { 
  TicketTypeSelect, 
  TicketStatusSelect, 
  TicketCategorySelect, 
  PartnerCompanySelect 
} from "@/components/selects";
import { TicketResponsibleSelect } from "./filters/TicketResponsibleSelect";
import type { TicketStatus, TicketType } from "../types";

interface TicketFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  type: TicketType | "all";
  onTypeChange: (value: TicketType | "all") => void;
  status: TicketStatus | "all";
  onStatusChange: (value: TicketStatus | "all") => void;
  categoryId: string | "all";
  onCategoryChange: (value: string) => void;
  partnerId: string | "all";
  onPartnerChange: (value: string) => void;
  responsibleId: string | undefined;
  onResponsibleChange: (value: string | undefined) => void;
  showOverdueOnly: boolean;
  onOverdueChange: (value: boolean) => void;
}

/**
 * Ticket filters using canonical select components.
 * All filter state is managed by the parent (URL state in TicketsListPage).
 */
export function TicketFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  status,
  onStatusChange,
  categoryId,
  onCategoryChange,
  partnerId,
  onPartnerChange,
  responsibleId,
  onResponsibleChange,
}: TicketFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Search */}
      <UrlSearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Buscar por título..."
        className="flex-1 min-w-[200px]"
        debounceMs={300}
      />

      {/* Type - using canonical component */}
      <TicketTypeSelect
        value={type}
        onValueChange={onTypeChange}
        includeAll
        allLabel="Todos os tipos"
        triggerClassName="w-[140px]"
      />

      {/* Status - using canonical component */}
      <TicketStatusSelect
        value={status}
        onValueChange={onStatusChange}
        includeAll
        allLabel="Todos os status"
        triggerClassName="w-[160px]"
      />

      {/* Category - using canonical component */}
      <TicketCategorySelect
        value={categoryId}
        onValueChange={onCategoryChange}
        includeAll
        allLabel="Todas categorias"
        triggerClassName="w-[180px]"
      />

      {/* Responsible - internal or external */}
      <TicketResponsibleSelect
        value={responsibleId}
        onValueChange={onResponsibleChange}
        includeAll
        allLabel="Todos responsáveis"
        triggerClassName="w-[180px]"
      />

      {/* Partner (only if external type selected) */}
      {type === "external" && (
        <PartnerCompanySelect
          value={partnerId}
          onValueChange={onPartnerChange}
          includeAll
          allLabel="Todos parceiros"
          triggerClassName="w-[180px]"
        />
      )}
    </div>
  );
}
