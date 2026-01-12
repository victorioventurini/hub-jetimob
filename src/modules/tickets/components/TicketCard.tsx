import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { Clock, AlertCircle, Building2, User, UserCircle, MessageSquare, AtSign } from "lucide-react";
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

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

export function TicketCard({ ticket }: TicketCardProps) {
  const status = statusConfig[ticket.status];
  const type = typeConfig[ticket.type];
  const isOverdue = ticket.expected_due_at && new Date(ticket.expected_due_at) < new Date() && ticket.status !== "done" && ticket.status !== "discarded";
  const isExternal = ticket.type === "external";

  // Get joined data
  const creatorProfile = ticket.created_by;
  const ownerProfile = ticket.owner;
  const partnerCompany = ticket.partner_company;
  const category = ticket.category;
  const subcategory = ticket.subcategory;
  const assignedContact = ticket.assigned_contact;
  
  // Aggregated data
  const messagesCount = ticket.messages_count ?? 0;
  const lastMessageAt = ticket.last_message_at;
  const mentionsList = ticket.mentions_list ?? [];
  const mentionsCount = mentionsList.length;

  // Show max 3 avatars for mentions
  const visibleMentions = mentionsList.slice(0, 3);
  const remainingMentions = mentionsList.length - 3;

  return (
    <Link to={`/tickets/${ticket.id}`} className="block">
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

              {/* Category & Subcategory */}
              {category && (
                <p className="text-sm text-muted-foreground truncate">
                  {category.name}
                  {subcategory && ` → ${subcategory.name}`}
                </p>
              )}

              {/* External ticket info: Company + Contact */}
              {isExternal && (partnerCompany || assignedContact) && (
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {partnerCompany && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{partnerCompany.name}</span>
                    </span>
                  )}
                  {assignedContact && (
                    <span className="flex items-center gap-1">
                      <UserCircle className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{assignedContact.name}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Activity info: Messages, Mentions, Last update */}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                {/* Messages count */}
                {messagesCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {messagesCount}
                  </span>
                )}
                
                {/* Mentions with avatars */}
                {mentionsCount > 0 && (
                  <div className="flex items-center gap-1">
                    <AtSign className="h-3 w-3" />
                    <div className="flex -space-x-1.5">
                      {visibleMentions.map((mention) => (
                        <OptimizedAvatar
                          key={mention.id}
                          src={mention.photo_url}
                          fallback={getInitials(mention.display_name)}
                          size="sm"
                          className="h-4 w-4 border border-background"
                          fallbackClassName="text-[8px]"
                        />
                      ))}
                      {remainingMentions > 0 && (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-muted text-[8px] font-medium border border-background">
                          +{remainingMentions}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Last update */}
                {lastMessageAt && (
                  <span className="flex items-center gap-1 text-muted-foreground/70">
                    Atualizado {formatDistanceToNow(new Date(lastMessageAt), { 
                      addSuffix: false, 
                      locale: ptBR 
                    })}
                  </span>
                )}
              </div>

              {/* Meta info: Creator + Created date + Due date */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {/* Creator */}
                {creatorProfile && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{creatorProfile.display_name}</span>
                  </span>
                )}
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
              <OptimizedAvatar
                src={ownerProfile.photo_url}
                fallback={getInitials(ownerProfile.display_name)}
                size="sm"
                className="h-8 w-8"
                fallbackClassName="text-xs"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
