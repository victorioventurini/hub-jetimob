import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Inbox } from "lucide-react";
import { useTickets, useMyTickets } from "../hooks/useTickets";
import { TicketCard } from "../components/TicketCard";
import { TicketFilters } from "../components/TicketFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState, useUrlTab, parsers } from "@/hooks/useUrlState";
import type { TicketStatus, TicketType } from "../types";

type TicketTab = "mine" | "waiting" | "in_progress" | "done" | "discarded";

export default function TicketsListPage() {
  const navigate = useNavigate();
  
  // URL State
  const [activeTab, setActiveTab] = useUrlTab<TicketTab>("mine");
  const [search, setSearch] = useUrlState<string>({ key: "q", defaultValue: "" });
  const [typeFilter, setTypeFilter] = useUrlState<TicketType | "all">({ key: "type", defaultValue: "all" });
  const [statusFilter, setStatusFilter] = useUrlState<TicketStatus | "all">({ key: "status", defaultValue: "all" });
  const [categoryId, setCategoryId] = useUrlState<string>({ key: "category", defaultValue: "all" });
  const [partnerId, setPartnerId] = useUrlState<string>({ key: "partner", defaultValue: "all" });
  const [showOverdue, setShowOverdue] = useUrlState<boolean>({ 
    key: "overdue", 
    defaultValue: false, 
    parse: parsers.boolean 
  });

  const { data: allTickets = [], isLoading: isLoadingAll } = useTickets();
  const { data: myTickets = [], isLoading: isLoadingMy } = useMyTickets();

  const filterTickets = (tickets: typeof allTickets) => {
    return tickets.filter((ticket) => {
      // Search filter
      if (search && !ticket.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Type filter
      if (typeFilter !== "all" && ticket.type !== typeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && ticket.status !== statusFilter) {
        return false;
      }
      // Category filter
      if (categoryId !== "all" && ticket.category_id !== categoryId) {
        return false;
      }
      // Partner filter
      if (partnerId !== "all" && ticket.partner_company_id !== partnerId) {
        return false;
      }
      return true;
    });
  };

  const tabTickets = useMemo(() => {
    switch (activeTab) {
      case "mine":
        return filterTickets(myTickets);
      case "waiting":
        return filterTickets(allTickets.filter(t => t.status === "waiting"));
      case "in_progress":
        return filterTickets(allTickets.filter(t => t.status === "in_progress"));
      case "done":
        return filterTickets(allTickets.filter(t => t.status === "done"));
      case "discarded":
        return filterTickets(allTickets.filter(t => t.status === "discarded"));
      default:
        return filterTickets(allTickets);
    }
  }, [activeTab, myTickets, allTickets, search, typeFilter, statusFilter, categoryId, partnerId]);

  const isLoading = isLoadingAll || isLoadingMy;

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Lista de Tickets</h2>
          <p className="text-sm text-muted-foreground">
            {tabTickets.length} ticket{tabTickets.length !== 1 ? "s" : ""} encontrado{tabTickets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link to="/tickets/new">
            <Plus className="h-4 w-4 mr-2" />
            Novo Ticket
          </Link>
        </Button>
      </div>

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
          ) : tabTickets.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhum ticket encontrado"
              description="Não há tickets que correspondam aos filtros selecionados."
              actionLabel="Criar primeiro ticket"
              onAction={() => navigate("/tickets/new")}
            />
          ) : (
            <div className="space-y-4">
              {tabTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
