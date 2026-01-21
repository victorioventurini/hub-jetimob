import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";
import { useTickets } from "@/modules/tickets/hooks";
import { TicketsTable } from "../components/TicketsTable";
import { TicketFilters } from "../components/TicketFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState, useLocalSearch, parsers } from "@/shared/url";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import type { TicketStatus, TicketType } from "../types";

export default function TicketsListPage() {
  const navigate = useNavigate();
  const { isExternal } = useExternalUser();
  
  // URL State for filters
  const { value: search, setValue: setSearch } = useLocalSearch("q");
  
  const typeState = useUrlState<TicketType | "all">({ key: "type", defaultValue: "all" });
  const typeFilter = typeState.value;
  const setTypeFilter = typeState.set;
  
  const statusState = useUrlState<TicketStatus | "all">({ key: "status", defaultValue: "all" });
  const statusFilter = statusState.value;
  const setStatusFilter = statusState.set;
  
  const categoryState = useUrlState<string>({ key: "category", defaultValue: "all" });
  const categoryId = categoryState.value;
  const setCategoryId = categoryState.set;
  
  const partnerState = useUrlState<string>({ key: "partner", defaultValue: "all" });
  const partnerId = partnerState.value;
  const setPartnerId = partnerState.set;
  
  const overdueState = useUrlState<boolean>({ 
    key: "overdue", 
    defaultValue: false, 
    parse: parsers.boolean 
  });
  const showOverdue = overdueState.value;
  const setShowOverdue = overdueState.set;

  // Build query filters
  const queryFilters = useMemo(() => ({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    category_id: categoryId !== "all" ? categoryId : undefined,
    partner_company_id: partnerId !== "all" ? partnerId : undefined,
    search: search || undefined,
    overdue: showOverdue || undefined,
  }), [typeFilter, statusFilter, categoryId, partnerId, search, showOverdue]);

  const { 
    data: tickets = [], 
    isLoading 
  } = useTickets(queryFilters);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TicketFilters
        search={search}
        onSearchChange={setSearch}
        type={typeFilter}
        onTypeChange={setTypeFilter}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        partnerId={partnerId}
        onPartnerChange={setPartnerId}
        showOverdueOnly={showOverdue}
        onOverdueChange={setShowOverdue}
      />

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nenhum ticket encontrado"
          description="Não há tickets que correspondam aos filtros selecionados."
          actionLabel={isExternal ? undefined : "Criar primeiro ticket"}
          onAction={isExternal ? undefined : () => navigate("/tickets/new")}
        />
      ) : (
        <TicketsTable tickets={tickets} />
      )}
    </div>
  );
}
