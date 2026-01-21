/**
 * Card showing user's recent tickets on the home dashboard
 * Displays stats (open, overdue, due today) and a list of recent tickets
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Plus, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMyTicketsHome, type HomeTicketSummary } from "@/hooks/useMyTicketsHome";
import { cn } from "@/lib/utils";

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
      variant === "warning" && "bg-amber-500/10 border-amber-500/20",
      variant === "danger" && "bg-destructive/10 border-destructive/20"
    )}>
      <span className={cn(
        "text-2xl font-bold",
        variant === "default" && "text-foreground",
        variant === "warning" && "text-amber-600 dark:text-amber-400",
        variant === "danger" && "text-destructive"
      )}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: HomeTicketSummary }) {
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className={cn(
        "w-full group flex items-start gap-3 p-4 rounded-lg border border-transparent transition-all text-left block",
        ticket.isOverdue 
          ? "bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/20" 
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
          {ticket.isOverdue && (
            <Badge variant="destructive" className="shrink-0 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Vencido
            </Badge>
          )}
          {ticket.isDueToday && !ticket.isOverdue && (
            <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-500/50">
              Vence hoje
            </Badge>
          )}
        </div>
        {ticket.categoryName && (
          <span className="text-xs text-muted-foreground">{ticket.categoryName}</span>
        )}
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

export function MyTicketsHomeCard() {
  const { tickets, stats, isLoading } = useMyTicketsHome();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
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
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Você não tem tickets abertos.</p>
            <p className="text-xs mt-1">Crie um ticket para registrar uma solicitação.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
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
