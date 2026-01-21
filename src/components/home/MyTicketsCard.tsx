/**
 * MyTicketsCard - Unified tickets card for all dashboard types
 * Supports: internal (with stats and overdue highlighting) and external (simple list)
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, MessageSquare, Plus, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMyTicketsHome, type HomeTicketSummary, type MyTicketsHomeStats } from "@/hooks/useMyTicketsHome";

export type MyTicketsCardVariant = "internal" | "external";

// Ticket types for both internal and external
export interface TicketItem {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  categoryName?: string | null;
  subcategoryName?: string | null;
  isOverdue?: boolean;
  isDueToday?: boolean;
}

interface MyTicketsCardBaseProps {
  variant?: MyTicketsCardVariant;
  isLoading?: boolean;
}

interface InternalTicketsCardProps extends MyTicketsCardBaseProps {
  variant?: "internal";
  // Internal uses hook internally
}

interface ExternalTicketsCardProps extends MyTicketsCardBaseProps {
  variant: "external";
  tickets: TicketItem[];
}

export type MyTicketsCardProps = InternalTicketsCardProps | ExternalTicketsCardProps;

const statusLabels: Record<string, string> = {
  waiting: "Aguardando",
  in_progress: "Em andamento",
  paused: "Pausado",
  done: "Concluído",
  discarded: "Cancelado",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  waiting: "secondary",
  in_progress: "default",
  paused: "outline",
  done: "default",
  discarded: "destructive",
};

function StatBox({ 
  value, 
  label, 
  variant = "default" 
}: { 
  value: number; 
  label: string; 
  variant?: "default" | "warning" | "danger";
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-3 rounded-lg border",
      variant === "default" && "bg-muted/50 border-border",
      variant === "warning" && "bg-status-yellow-muted border-status-yellow/20",
      variant === "danger" && "bg-status-red-muted border-status-red/20"
    )}>
      <span className={cn(
        "text-2xl font-bold",
        variant === "default" && "text-foreground",
        variant === "warning" && "text-status-yellow",
        variant === "danger" && "text-status-red"
      )}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function TicketRow({ ticket, isInternal }: { ticket: TicketItem; isInternal: boolean }) {
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className={cn(
        "w-full group flex items-start gap-3 p-4 rounded-lg border border-transparent transition-all text-left block",
        isInternal && ticket.isOverdue 
          ? "bg-status-red-muted/50 hover:bg-status-red-muted hover:border-status-red/20" 
          : "bg-muted/50 hover:bg-muted hover:border-border"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[200px] sm:max-w-none">
            {ticket.title}
          </p>
          <Badge variant={statusVariants[ticket.status] || "secondary"} className="shrink-0">
            {statusLabels[ticket.status] || ticket.status}
          </Badge>
          {isInternal && ticket.isOverdue && (
            <Badge variant="destructive" className="shrink-0 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Vencido
            </Badge>
          )}
          {isInternal && ticket.isDueToday && !ticket.isOverdue && (
            <Badge variant="outline" className="shrink-0 text-status-yellow border-status-yellow/50">
              Vence hoje
            </Badge>
          )}
        </div>
        {/* Categories - both internal and external */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {ticket.categoryName && (
            <span>{ticket.categoryName}</span>
          )}
          {ticket.categoryName && ticket.subcategoryName && (
            <span>•</span>
          )}
          {ticket.subcategoryName && (
            <span>{ticket.subcategoryName}</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Atualizado {formatDistanceToNow(new Date(ticket.updatedAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all mt-1 shrink-0" />
    </Link>
  );
}

function LoadingState({ isExternal }: { isExternal: boolean }) {
  return (
    <Card className={isExternal ? "col-span-full" : ""}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {!isExternal && (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({ isExternal }: { isExternal: boolean }) {
  const Icon = isExternal ? MessageSquare : Ticket;
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">
        {isExternal ? "Você ainda não tem tickets." : "Você não tem tickets abertos."}
      </p>
      <p className="text-xs mt-1">
        {isExternal 
          ? "Aguarde ser adicionado a um ticket pela equipe." 
          : "Crie um ticket para registrar uma solicitação."}
      </p>
    </div>
  );
}

// Internal variant component
function InternalTicketsCard({ isLoading: externalLoading }: { isLoading?: boolean }) {
  const { tickets, stats, isLoading: hookLoading } = useMyTicketsHome();
  const isLoading = externalLoading || hookLoading;

  if (isLoading) {
    return <LoadingState isExternal={false} />;
  }

  const hasTickets = tickets.length > 0;
  const hasStats = stats.totalOpen > 0 || stats.overdueCount > 0 || stats.dueTodayCount > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg">Meus Tickets</CardTitle>
        </div>
        <Button asChild size="sm">
          <Link to="/tickets/new">
            <Plus className="h-4 w-4 mr-1" />
            Novo ticket
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        {hasStats && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatBox value={stats.totalOpen} label="Abertos" />
            <StatBox 
              value={stats.overdueCount} 
              label="Vencidos" 
              variant={stats.overdueCount > 0 ? "danger" : "default"}
            />
            <StatBox 
              value={stats.dueTodayCount} 
              label="Vence hoje" 
              variant={stats.dueTodayCount > 0 ? "warning" : "default"}
            />
          </div>
        )}

        {/* Tickets List or Empty State */}
        {!hasTickets ? (
          <EmptyState isExternal={false} />
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} isInternal />
            ))}
          </div>
        )}

        {/* Footer with View All */}
        {hasTickets && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-primary"
            >
              <Link to="/tickets">
                Ver todos os tickets
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// External variant component - external users cannot create tickets
function ExternalTicketsCard({ tickets, isLoading }: { tickets: TicketItem[]; isLoading?: boolean }) {
  if (isLoading) {
    return <LoadingState isExternal />;
  }

  const hasTickets = tickets.length > 0;

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg">Meus Tickets</CardTitle>
        </div>
        {/* External users cannot create tickets - removed button */}
      </CardHeader>
      <CardContent>
        {/* Tickets List or Empty State */}
        {!hasTickets ? (
          <EmptyState isExternal />
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} isInternal={false} />
            ))}
          </div>
        )}

        {/* Footer with View All */}
        {hasTickets && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-primary"
            >
              <Link to="/tickets?type=external">
                Ver todos os tickets
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MyTicketsCard(props: MyTicketsCardProps) {
  const { variant = "internal", isLoading } = props;

  if (variant === "external") {
    const { tickets } = props as ExternalTicketsCardProps;
    return <ExternalTicketsCard tickets={tickets} isLoading={isLoading} />;
  }

  return <InternalTicketsCard isLoading={isLoading} />;
}
