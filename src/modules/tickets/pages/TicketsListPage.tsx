import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Inbox } from "lucide-react";
import { useTickets } from "@/modules/tickets/hooks";
import { TicketsTable } from "../components/TicketsTable";
import { TicketCard } from "../components/TicketCard";
import { TicketFilters } from "../components/TicketFilters";
import { parseResponsibleValue } from "../components/filters/TicketResponsibleSelect";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState, useLocalSearch, parsers } from "@/shared/url";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { TicketStatus, TicketType } from "../types";

export default function TicketsListPage() {
  usePageTitle("Tickets", {
    customDescription: "Gerencie tickets internos e externos, acompanhe status, prazos e mensagens.",
  });
  const navigate = useNavigate();
  const { isExternal } = useExternalUser();
  const { isImpersonating, impersonatedUser } = useOptionalImpersonation();
  
  // Check if impersonating an external user
  const isViewingAsExternal = isImpersonating && impersonatedUser?.employmentStatus === "external";
  const canCreateTicket = !isExternal && !isViewingAsExternal;
  
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
  
  // Responsible filter (format: "internal:{id}" or "external:{id}")
  const responsibleState = useUrlState<string>({ key: "responsible", defaultValue: "" });
  const responsibleId = responsibleState.value || undefined;
  const setResponsibleId = (val: string | undefined) => responsibleState.set(val || "");
  
  const overdueState = useUrlState<boolean>({ 
    key: "overdue", 
    defaultValue: false, 
    parse: parsers.boolean 
  });
  const showOverdue = overdueState.value;
  const setShowOverdue = overdueState.set;

  const dueTodayState = useUrlState<boolean>({ 
    key: "due_today", 
    defaultValue: false, 
    parse: parsers.boolean 
  });
  const showDueToday = dueTodayState.value;

  // Toggle: incluir concluídos e descartados na listagem padrão (status="all").
  // Default OFF — esconde 'done' e 'discarded' para não poluir a lista de tickets ativos.
  const includeClosedState = useUrlState<boolean>({
    key: "include_closed",
    defaultValue: false,
    parse: parsers.boolean,
  });
  const includeClosed = includeClosedState.value;
  const setIncludeClosed = includeClosedState.set;

  // Parse responsible filter into owner_user_id or assigned_contact_id
  const parsedResponsible = useMemo(() => parseResponsibleValue(responsibleId), [responsibleId]);

  // Default statuses quando o usuário escolhe "Todos os status".
  // Filtro pontual de status (statusFilter !== "all") sempre prevalece sobre o toggle.
  const DEFAULT_STATUSES: TicketStatus[] = includeClosed
    ? ['waiting', 'paused', 'in_progress', 'done', 'discarded']
    : ['waiting', 'paused', 'in_progress'];

  // Build query filters
  const queryFilters = useMemo(() => ({
    type: typeFilter !== "all" ? typeFilter : undefined,
    // When "all" is selected, apply DEFAULT_STATUSES (respeita toggle includeClosed).
    status: statusFilter !== "all" ? statusFilter : DEFAULT_STATUSES,
    category_id: categoryId !== "all" ? categoryId : undefined,
    external_company_id: partnerId !== "all" ? partnerId : undefined,
    owner_user_id: parsedResponsible.type === "internal" ? parsedResponsible.id ?? undefined : undefined,
    assigned_contact_id: parsedResponsible.type === "external" ? parsedResponsible.id ?? undefined : undefined,
    search: search || undefined,
    overdue: showOverdue || undefined,
    due_today: showDueToday || undefined,
  }), [typeFilter, statusFilter, categoryId, partnerId, parsedResponsible, search, showOverdue, showDueToday, includeClosed]);

  const { 
    data: tickets = [], 
    isLoading,
    error,
    refetch,
  } = useTickets(queryFilters);

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Não foi possível carregar os tickets"
        description={
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao buscar seus tickets. Tente novamente."
        }
        actionLabel="Tentar novamente"
        onAction={() => refetch()}
      />
    );
  }

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
        responsibleId={responsibleId}
        onResponsibleChange={setResponsibleId}
        showOverdueOnly={showOverdue}
        onOverdueChange={setShowOverdue}
        includeClosed={includeClosed}
        onIncludeClosedChange={setIncludeClosed}
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
          description={
            !includeClosed && statusFilter === "all"
              ? "Concluídos e descartados estão ocultos. Ative \"Incluir concluídos e descartados\" para vê-los."
              : "Não há tickets que correspondam aos filtros selecionados."
          }
          actionLabel={canCreateTicket ? "Criar primeiro ticket" : undefined}
          onAction={canCreateTicket ? () => navigate("/tickets/new") : undefined}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block">
            <TicketsTable tickets={tickets} />
          </div>
        </>
      )}
    </div>
  );
}
