import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Paperclip, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ticket, TicketStatus, TicketType } from "../types";

interface TicketCardProps {
  ticket: Ticket;
}

const statusConfig: Record<TicketStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  waiting: { label: "Aguardando", variant: "secondary" },
  paused: { label: "Pausado", variant: "outline" },
  in_progress: { label: "Em andamento", variant: "default" },
  done: { label: "Concluído", variant: "secondary" },
  discarded: { label: "Descartado", variant: "destructive" },
};

const typeConfig: Record<TicketType, { label: string; className: string }> = {
  internal: { label: "Interno", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  external: { label: "Externo", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

export function TicketCard({ ticket }: TicketCardProps) {
  const status = statusConfig[ticket.status];
  const type = typeConfig[ticket.type];
  const isOverdue = ticket.expected_due_at && new Date(ticket.expected_due_at) < new Date() && ticket.status !== "done" && ticket.status !== "discarded";

  const ownerProfile = ticket.owner_user_id ? (ticket as any).owner : null;
  const creatorProfile = ticket.created_by_user_id ? (ticket as any).creator : null;

  return (
    <Link to={`/tickets/${ticket.id}`}>
      <Card className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        isOverdue && "border-destructive/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header: Type + Status */}
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("px-2 py-0.5 rounded text-xs font-medium", type.className)}>
                  {type.label}
                </span>
                <Badge variant={status.variant} className="text-xs">
                  {status.label}
                </Badge>
                {isOverdue && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Atrasado
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-medium text-foreground truncate mb-1">
                {ticket.title}
              </h3>

              {/* Category */}
              {(ticket as any).category && (
                <p className="text-sm text-muted-foreground truncate">
                  {(ticket as any).category.name}
                  {(ticket as any).subcategory && ` → ${(ticket as any).subcategory.name}`}
                </p>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(ticket.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
                {ticket.expected_due_at && (
                  <span className={cn(
                    "flex items-center gap-1",
                    isOverdue && "text-destructive"
                  )}>
                    Prazo: {new Date(ticket.expected_due_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>

            {/* Owner avatar */}
            {ownerProfile && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={ownerProfile.avatar_url} />
                <AvatarFallback className="text-xs">
                  {ownerProfile.full_name?.slice(0, 2).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
