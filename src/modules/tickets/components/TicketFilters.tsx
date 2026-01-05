import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useTicketCategories } from "../hooks/useTicketCategories";
import { usePartnerCompanies } from "../hooks/usePartners";
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
  showOverdueOnly: boolean;
  onOverdueChange: (value: boolean) => void;
}

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
  showOverdueOnly,
  onOverdueChange,
}: TicketFiltersProps) {
  const { data: categories = [] } = useTicketCategories();
  const { data: partners = [] } = usePartnerCompanies();

  return (
    <div className="flex flex-wrap gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type */}
      <Select value={type} onValueChange={(v) => onTypeChange(v as TicketType | "all")}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="internal">Interno</SelectItem>
          <SelectItem value="external">Externo</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={status} onValueChange={(v) => onStatusChange(v as TicketStatus | "all")}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="waiting">Aguardando</SelectItem>
          <SelectItem value="in_progress">Em andamento</SelectItem>
          <SelectItem value="paused">Pausado</SelectItem>
          <SelectItem value="done">Concluído</SelectItem>
          <SelectItem value="discarded">Descartado</SelectItem>
        </SelectContent>
      </Select>

      {/* Category */}
      <Select value={categoryId} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Partner (only if external type selected) */}
      {type === "external" && (
        <Select value={partnerId} onValueChange={onPartnerChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Parceiro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos parceiros</SelectItem>
            {partners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
