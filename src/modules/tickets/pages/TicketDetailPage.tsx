import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Clock, User, Building2, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTicket, useUpdateTicketStatus } from "../hooks/useTickets";
import { useTicketMessages, useCreateMessage } from "../hooks/useTicketMessages";
import { useAuth } from "@/hooks/useAuth";
import { useIdentity } from "@/hooks/useIdentity";
import type { TicketStatus } from "../types";

const statusConfig: Record<TicketStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  waiting: { label: "Aguardando", variant: "secondary" },
  paused: { label: "Pausado", variant: "outline" },
  in_progress: { label: "Em andamento", variant: "default" },
  done: { label: "Concluído", variant: "secondary" },
  discarded: { label: "Descartado", variant: "destructive" },
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profileId } = useIdentity();
  const [newMessage, setNewMessage] = useState("");

  const { data: ticket, isLoading: isLoadingTicket } = useTicket(id!);
  const { data: messages = [], isLoading: isLoadingMessages } = useTicketMessages(id!);
  const updateStatus = useUpdateTicketStatus();
  const createMessage = useCreateMessage(profileId);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    await updateStatus.mutateAsync({ id: ticket.id, status: newStatus });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket) return;
    
    await createMessage.mutateAsync({
      ticketId: ticket.id,
      data: { body_richtext: { type: "text", content: newMessage } },
    });
    setNewMessage("");
  };

  if (isLoadingTicket) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket não encontrado</p>
        <Button asChild variant="link">
          <Link to="/tickets">Voltar para lista</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[ticket.status];
  const isExternal = ticket.type === "external";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/tickets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                isExternal 
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              )}>
                {isExternal ? "Externo" : "Interno"}
              </span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <h1 className="text-xl font-bold">{ticket.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Criado {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ptBR })}
              </span>
              {ticket.expected_due_at && (
                <span>
                  Prazo: {format(new Date(ticket.expected_due_at), "dd/MM/yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status changer */}
        <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as TicketStatus)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="waiting">Aguardando</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="paused">Pausado</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
            <SelectItem value="discarded">Descartado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Messages Thread */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagens</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMessages ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma mensagem ainda. Seja o primeiro a comentar!
                </p>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwnMessage = message.author_user_id === profileId;
                      const authorProfile = (message as any).author;
                      
                      return (
                        <div key={message.id} className={cn(
                          "flex gap-3",
                          isOwnMessage && "flex-row-reverse"
                        )}>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={authorProfile?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {authorProfile?.full_name?.slice(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "flex-1 max-w-[80%]",
                            isOwnMessage && "text-right"
                          )}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {authorProfile?.full_name || "Usuário"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(message.created_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                            </div>
                            <div className={cn(
                              "rounded-lg px-4 py-2 text-sm",
                              isOwnMessage 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted"
                            )}>
                              {typeof message.body_richtext === "object" && message.body_richtext !== null
                                ? (message.body_richtext as any).content || JSON.stringify(message.body_richtext)
                                : String(message.body_richtext)
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              <Separator className="my-4" />

              {/* Message input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) {
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim() || createMessage.isPending}
                  className="shrink-0"
                >
                  {createMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category */}
              {(ticket as any).category && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Categoria</p>
                  <p className="text-sm font-medium">
                    {(ticket as any).category.name}
                    {(ticket as any).subcategory && ` → ${(ticket as any).subcategory.name}`}
                  </p>
                </div>
              )}

              {/* Partner */}
              {isExternal && (ticket as any).partner && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Parceiro</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{(ticket as any).partner.name}</span>
                  </div>
                </div>
              )}

              {/* Owner */}
              {(ticket as any).owner && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Responsável</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={(ticket as any).owner.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(ticket as any).owner.full_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{(ticket as any).owner.full_name}</span>
                  </div>
                </div>
              )}

              {/* Creator */}
              {(ticket as any).creator && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Criado por</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={(ticket as any).creator.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(ticket as any).creator.full_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{(ticket as any).creator.full_name}</span>
                  </div>
                </div>
              )}

              {/* Visibility */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Visibilidade</p>
                <p className="text-sm">
                  {ticket.visibility === "bu_all" && "Toda a BU"}
                  {ticket.visibility === "teams" && "Times específicos"}
                  {ticket.visibility === "users" && "Usuários específicos"}
                  {ticket.visibility === "private" && "Privado"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
