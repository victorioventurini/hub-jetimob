/**
 * Card showing recent tickets for external user
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus, ArrowRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ExternalTicketSummary } from "../types";

interface MyTicketsCardProps {
  tickets: ExternalTicketSummary[];
  isLoading?: boolean;
}

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

export function MyTicketsCard({ tickets, isLoading }: MyTicketsCardProps) {
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg">Meus Tickets</CardTitle>
        </div>
        <Button asChild size="sm">
          <Link to="/tickets/new?type=external">
            <Plus className="h-4 w-4 mr-1" />
            Criar novo ticket
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Você ainda não tem tickets.</p>
            <p className="text-xs mt-1">Crie um ticket para iniciar uma solicitação.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="w-full group flex items-start gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted border border-transparent hover:border-border transition-all text-left block"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {ticket.title}
                    </p>
                    <Badge variant={statusVariants[ticket.status] || "secondary"}>
                      {statusLabels[ticket.status] || ticket.status}
                    </Badge>
                  </div>
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
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all mt-1" />
              </Link>
            ))}
          </div>
        )}

        {tickets.length > 0 && (
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
