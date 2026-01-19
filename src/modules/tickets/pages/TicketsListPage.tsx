import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Inbox } from "lucide-react";
import { useTickets, useMyTickets } from "@/modules/tickets/hooks";
import { TicketCard } from "../components/TicketCard";
import { TicketFilters } from "../components/TicketFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState, useUrlTab, useLocalSearch, parsers } from "@/shared/url";
import type { TicketStatus, TicketType, Ticket } from "../types";

type TicketTab = "mine" | "waiting" | "in_progress" | "done" | "discarded";

export default function TicketsListPage() {
  const navigate = useNavigate();
  
  // URL State - object API
  const [activeTab, setActiveTab] = useUrlTab<TicketTab>("mine");
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
  const tabStatusFilter = useMemo((): TicketStatus | TicketStatus[] | undefined => {
    switch (activeTab) {
      case "waiting":
        return "waiting";
      case "in_progress":
        return "in_progress";
      case "done":
        return "done";
      case "discarded":
        return "discarded";
      default:
        return statusFilter !== "all" ? statusFilter : undefined;
    }
  }, [activeTab, statusFilter]);

  // Use query for "all" tabs, my tickets for "mine" tab
  const queryFilters = useMemo(() => ({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: tabStatusFilter,
    category_id: categoryId !== "all" ? categoryId : undefined,
    partner_company_id: partnerId !== "all" ? partnerId : undefined,
    search: search || undefined,
    overdue: showOverdue || undefined,
  }), [typeFilter, tabStatusFilter, categoryId, partnerId, search, showOverdue]);

  const { 
    data: ticketsResponse, 
    isLoading: isLoadingAll 
  } = useTickets(activeTab !== "mine" ? queryFilters : undefined);
  
  const { data: myTickets = [], isLoading: isLoadingMy } = useMyTickets();

  // Filter my tickets client-side (small dataset)
  const filteredMyTickets = useMemo(() => {
    return myTickets.filter((ticket: Ticket) => {
      if (search && !ticket.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (typeFilter !== "all" && ticket.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== "all" && ticket.status !== statusFilter) {
        return false;
      }
      if (categoryId !== "all" && ticket.category_id !== categoryId) {
        return false;
      }
      if (partnerId !== "all" && ticket.partner_company_id !== partnerId) {
        return false;
      }
      return true;
    });
  }, [myTickets, search, typeFilter, statusFilter, categoryId, partnerId]);

  // Get the right data based on active tab
  const displayTickets = activeTab === "mine" 
    ? filteredMyTickets 
    : (ticketsResponse ?? []);
  
  const totalItems = displayTickets.length;

  const isLoading = activeTab === "mine" ? isLoadingMy : isLoadingAll;

  // Handler for tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TicketTab);
  };

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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="mine">Meus</TabsTrigger>
          <TabsTrigger value="waiting">Aguardando</TabsTrigger>
          <TabsTrigger value="in_progress">Em andamento</TabsTrigger>
          <TabsTrigger value="done">Concluídos</TabsTrigger>
          <TabsTrigger value="discarded">Descartados</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : displayTickets.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhum ticket encontrado"
              description="Não há tickets que correspondam aos filtros selecionados."
              actionLabel="Criar primeiro ticket"
              onAction={() => navigate("/tickets/new")}
            />
          ) : (
            <div className="space-y-4">
              {displayTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

    </div>
  );
}
