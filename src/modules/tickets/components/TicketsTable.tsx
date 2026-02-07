/**
 * TicketsTable - Table view for tickets listing
 * Displays tickets in a structured table format with columns
 * Uses canonical styles from colors.ts for type and status badges
 */

import { Link } from "react-router-dom";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Clock, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TICKET_STATUS_STYLES, TICKET_TYPE_STYLES } from "@/lib/colors";
import { StagnantBadge } from "./StagnantBadge";
import type { Ticket, TicketStatus, TicketType } from "../types";

interface TicketsTableProps {
  tickets: Ticket[];
}

const statusLabels: Record<TicketStatus, string> = {
  waiting: "Aguardando",
  in_progress: "Em andamento",
  paused: "Pausado",
  done: "Concluído",
  discarded: "Descartado",
};

const typeLabels: Record<TicketType, string> = {
  internal: "Interno",
  external: "Externo",
};

export function TicketsTable({ tickets }: TicketsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Criado por</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead className="text-right">Atualizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => {
            const isOverdue = ticket.expected_due_at && isPast(new Date(ticket.expected_due_at)) && ticket.status !== "done" && ticket.status !== "discarded";
            const isDueToday = ticket.expected_due_at && isToday(new Date(ticket.expected_due_at)) && ticket.status !== "done" && ticket.status !== "discarded";
            
            // Get owner/assignee name
            const responsibleName = ticket.type === "external" && ticket.assigned_contact
              ? ticket.assigned_contact.name
              : ticket.owner?.display_name;
            
            const responsiblePhoto = ticket.type === "external" 
              ? null 
              : ticket.owner?.photo_url;

            return (
              <TableRow 
                key={ticket.id} 
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  isOverdue && "bg-status-red-muted/30"
                )}
              >
                <TableCell>
                  <Link 
                    to={`/tickets/${ticket.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium group-hover:text-primary transition-colors line-clamp-1">
                        {ticket.title}
                      </span>
                      {isOverdue && (
                        <AlertTriangle className="h-4 w-4 text-status-red shrink-0" />
                      )}
                    </div>
                    {ticket.external_company && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="h-3 w-3" />
                        <span className="line-clamp-1">{ticket.external_company.name}</span>
                      </div>
                    )}
                  </Link>
                </TableCell>
                
                <TableCell>
                  <Badge className={cn("gap-1.5 text-xs", TICKET_TYPE_STYLES[ticket.type].badge)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", TICKET_TYPE_STYLES[ticket.type].dot)} />
                    {typeLabels[ticket.type]}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className={cn("gap-1.5", TICKET_STATUS_STYLES[ticket.status].badge)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", TICKET_STATUS_STYLES[ticket.status].dot)} />
                      {statusLabels[ticket.status]}
                    </Badge>
                    <StagnantBadge ticket={ticket} />
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm">
                    {ticket.category?.name && (
                      <span className="text-foreground">{ticket.category.name}</span>
                    )}
                    {ticket.subcategory?.name && (
                      <span className="text-muted-foreground"> → {ticket.subcategory.name}</span>
                    )}
                    {!ticket.category?.name && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  {ticket.created_by ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.created_by.photo_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {ticket.created_by.display_name?.slice(0, 2).toUpperCase() ?? "??"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm line-clamp-1">{ticket.created_by.display_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {responsibleName ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={responsiblePhoto ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {responsibleName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm line-clamp-1">{responsibleName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </TableCell>
                
                <TableCell>
                  {ticket.expected_due_at ? (
                    <div className={cn(
                      "flex items-center gap-1 text-sm",
                      isOverdue && "text-status-red font-medium",
                      isDueToday && !isOverdue && "text-status-yellow font-medium"
                    )}>
                      <Clock className="h-3 w-3" />
                      {format(new Date(ticket.expected_due_at), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                
                <TableCell className="text-right">
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.updated_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
