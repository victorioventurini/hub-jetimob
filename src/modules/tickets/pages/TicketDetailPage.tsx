import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { HubLayout } from "@/components/layout/HubLayout";
import { VicErrorState } from "@/modules/vic/components/VicErrorState";
import { useTicket, useUpdateTicketStatus, useTicketMessages, useTicketAttachments, useCreateMessage } from "@/modules/tickets/hooks";
import { useIdentity } from "@/hooks/useIdentity";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSafeBack } from "@/hooks/useSafeBack";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { useBu } from "@/contexts/BuContext";
import { TicketsBreadcrumb } from "@/components/ui/global-breadcrumb";
import { TicketMessageBubble } from "../components/TicketMessageBubble";
import { TicketMessageComposer } from "../components/TicketMessageComposer";
import { TicketDetailHeader } from "../components/TicketDetailHeader";
import { UserLink } from "@/components/links/UserLink";
import type { TicketStatus } from "../types";
import type { ParsedMention } from "@/components/mentions";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profileId } = useIdentity();
  const { isExternal, externalContacts } = useExternalUser();
  const { currentBu } = useBu();
  const goBack = useSafeBack({ moduleRoot: "/tickets" });

  // Get the correct contactId for the current BU (if external user)
  const currentBuContactId = useMemo(() => {
    if (!isExternal || !currentBu?.id || !externalContacts) return null;
    const contact = externalContacts.find(c => c.buId === currentBu.id);
    return contact?.contactId ?? null;
  }, [isExternal, currentBu?.id, externalContacts]);

  const { data: ticket, isLoading: isLoadingTicket, error: ticketError } = useTicket(id!);
  const { data: messages = [], isLoading: isLoadingMessages } = useTicketMessages(id!);
  const { data: attachments = [] } = useTicketAttachments(id!);
  const updateStatus = useUpdateTicketStatus();
  const createMessage = useCreateMessage({ 
    profileId, 
    contactId: currentBuContactId 
  });

  // SEO - Meta title e description
  usePageTitle(
    ticket ? `Ticket: ${ticket.title}` : "Ticket",
    {
      pageType: "subpage",
      customDescription: ticket 
        ? `Visualize e acompanhe o ticket "${ticket.title}"`
        : "Visualize detalhes do ticket",
    }
  );

  // Group attachments by message_id
  const attachmentsByMessage = useMemo(() => {
    const map = new Map<string, typeof attachments>();
    attachments.forEach((att) => {
      if (att.message_id) {
        const existing = map.get(att.message_id) || [];
        existing.push(att);
        map.set(att.message_id, existing);
      }
    });
    return map;
  }, [attachments]);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    await updateStatus.mutateAsync({ id: ticket.id, status: newStatus });
  };

  const handleSendMessage = async (data: {
    content: string;
    mentions: ParsedMention[];
    files: File[];
  }) => {
    if (!ticket) return;
    
    try {
      await createMessage.mutateAsync({
        ticketId: ticket.id,
        data: {
          body_richtext: { type: "text", content: data.content },
          attachments: data.files.length > 0 ? data.files : undefined,
          mentions: data.mentions.map((m) => ({
            user_id: m.userId || undefined,
            contact_id: m.contactId || undefined,
          })),
        },
      });
      toast.success("Mensagem enviada");
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
      throw error;
    }
  };

  if (isLoadingTicket) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </HubLayout>
    );
  }

  if (ticketError) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <TicketsBreadcrumb />
          <VicErrorState
            title="Ops, esse ticket escapou! 🎫"
            description="Não consegui acessar esse ticket. Pode ser que você não tenha permissão ou ele não existe mais."
            onBack={goBack}
          />
        </div>
      </HubLayout>
    );
  }

  if (!ticket) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <TicketsBreadcrumb />
          <VicErrorState
            title="Esse ticket sumiu! 👀"
            description="O ticket que você está procurando não existe ou foi removido."
            onBack={goBack}
            backLabel="Voltar para lista"
          />
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <TicketsBreadcrumb ticketId={ticket.id} ticketTitle={ticket.title} />

        {/* Header - usando componente especializado */}
        <TicketDetailHeader
          title={ticket.title}
          type={ticket.type}
          status={ticket.status}
          createdAt={ticket.created_at}
          expectedDueAt={ticket.expected_due_at}
          onStatusChange={handleStatusChange}
          isUpdating={updateStatus.isPending}
        />

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
                      const messageAttachments = attachmentsByMessage.get(message.id) || [];
                      
                      return (
                        <TicketMessageBubble
                          key={message.id}
                          message={message}
                          isOwnMessage={isOwnMessage}
                          attachments={messageAttachments}
                        />
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              <Separator className="my-4" />

              {/* Message composer with mentions and file upload */}
              <TicketMessageComposer
                onSend={handleSendMessage}
                isSubmitting={createMessage.isPending}
                partnerCompanyId={ticket.type === "external" ? ticket.partner_company_id : null}
                placeholder="Digite sua mensagem... Use @ para mencionar"
              />
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
              {ticket.type === "external" && (ticket as any).partner && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Parceiro</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{(ticket as any).partner.name}</span>
                  </div>
                </div>
              )}

              {/* Owner */}
              {ticket.owner && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Responsável</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={ticket.owner.photo_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {ticket.owner.display_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <UserLink 
                      userId={ticket.owner.id} 
                      displayName={ticket.owner.display_name || 'Usuário'} 
                      openInNewTab 
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Creator */}
              {ticket.created_by && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Criado por</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={ticket.created_by.photo_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {ticket.created_by.display_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <UserLink 
                      userId={ticket.created_by.id} 
                      displayName={ticket.created_by.display_name || 'Usuário'} 
                      openInNewTab 
                      className="text-sm"
                    />
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
    </HubLayout>
  );
}
