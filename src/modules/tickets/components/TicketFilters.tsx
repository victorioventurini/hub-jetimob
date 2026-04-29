import { UrlSearchInput } from "@/shared/filters";
import { 
  TicketTypeSelect, 
  TicketStatusSelect, 
  TicketCategorySelect, 
  PartnerCompanySelect 
} from "@/components/selects";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  includeClosed: boolean;
  onIncludeClosedChange: (value: boolean) => void;
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
  includeClosed,
  onIncludeClosedChange,
}: TicketFiltersProps) {
  // Toggle só faz sentido quando "Todos os status" está selecionado.
  // Se o usuário escolheu um status pontual, o filtro pontual prevalece — desabilitamos o toggle.
  const isStatusAll = status === "all";

  return (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
      {/* Search */}
      <UrlSearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Buscar por título..."
        className="w-full sm:flex-1 sm:min-w-[200px]"
        debounceMs={300}
      />

      {/* Type - using canonical component */}
      <TicketTypeSelect
        value={type}
        onValueChange={onTypeChange}
        includeAll
        allLabel="Todos os tipos"
        triggerClassName="w-full sm:w-[140px]"
      />

      {/* Status - using canonical component */}
      <TicketStatusSelect
        value={status}
        onValueChange={onStatusChange}
        includeAll
        allLabel="Todos os status"
        triggerClassName="w-full sm:w-[160px]"
      />

      {/* Category - using canonical component */}
      <TicketCategorySelect
        value={categoryId}
        onValueChange={onCategoryChange}
        includeAll
        allLabel="Todas categorias"
        triggerClassName="w-full sm:w-[180px]"
      />

      {/* Responsible - internal or external */}
      <TicketResponsibleSelect
        value={responsibleId}
        onValueChange={onResponsibleChange}
        includeAll
        allLabel="Todos responsáveis"
        triggerClassName="w-full sm:w-[180px]"
      />

      {/* Partner (only if external type selected) */}
      {type === "external" && (
        <PartnerCompanySelect
          value={partnerId}
          onValueChange={onPartnerChange}
          includeAll
          allLabel="Todos parceiros"
          triggerClassName="w-full sm:w-[180px]"
        />
      )}

      {/* Toggle inline: incluir concluídos e descartados */}
      <div className="flex items-center gap-2 sm:ml-auto">
        <Switch
          id="include-closed-toggle"
          checked={includeClosed}
          onCheckedChange={onIncludeClosedChange}
          disabled={!isStatusAll}
        />
        <Label
          htmlFor="include-closed-toggle"
          className={`text-sm cursor-pointer whitespace-nowrap ${!isStatusAll ? "text-muted-foreground" : ""}`}
        >
          Incluir concluídos e descartados
        </Label>
      </div>
    </div>
  );
}
