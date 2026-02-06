import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { HubLayout } from "@/components/layout/HubLayout";
import { VicErrorState } from "@/modules/vic/components/VicErrorState";
import { useTicket, useUpdateTicketStatus, useTicketMessages, useTicketAttachments, useCreateMessage, useTransferTicket, usePinMessage, canUserPinMessages, useTicketViewersAndMentions, type TicketContext } from "@/modules/tickets/hooks";
import { useIdentity } from "@/hooks/useIdentity";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSafeBack } from "@/hooks/useSafeBack";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { useBu } from "@/contexts/BuContext";
// TicketsBreadcrumb removido - integrado no TicketDetailHeader (padrão canônico)
import { TicketMessageBubble } from "../components/TicketMessageBubble";
import { TicketMessageComposer } from "../components/TicketMessageComposer";
import { TicketDetailHeader } from "../components/TicketDetailHeader";
import { TicketTransferModal } from "../components/TicketTransferModal";
import { TicketDetailSidebar } from "../components/TicketDetailSidebar";
import { PinnedMessagesSection } from "../components/PinnedMessagesSection";
import type { TicketStatus, TicketMessage } from "../types";
import type { ParsedMention } from "@/components/mentions";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profileId, realProfileId, userId } = useIdentity();
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
  const { data: viewersData } = useTicketViewersAndMentions(ticket);
  const updateStatus = useUpdateTicketStatus();
  const transferTicket = useTransferTicket(profileId, userId);
  // Build ticket context for auto-status change when responsible sends message
  const ticketContext: TicketContext | undefined = useMemo(() => {
    if (!ticket) return undefined;
    return {
      type: ticket.type,
      status: ticket.status,
      owner_user_id: ticket.owner_user_id,
      assigned_contact_id: ticket.assigned_contact_id,
    };
  }, [ticket]);

  const createMessage = useCreateMessage(
    { profileId: realProfileId, contactId: currentBuContactId },
    ticketContext
  );
  const pinMessage = usePinMessage();
  
  // Refs for auto-scrolling to bottom
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  
  // Scroll to bottom when messages load initially
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledRef.current && scrollViewportRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
          hasScrolledRef.current = true;
        }
      });
    }
  }, [messages.length]);
  
  // Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  
  // Reply state - tracks message being replied to
  const [replyingTo, setReplyingTo] = useState<TicketMessage | null>(null);

  // Check if user can pin messages
  const canPin = useMemo(() => {
    if (!ticket || !profileId) return false;
    return canUserPinMessages(ticket, profileId, currentBuContactId);
  }, [ticket, profileId, currentBuContactId]);

  // Check if user can change ticket status (creator, owner/responsible, or admin)
  const canChangeStatus = useMemo(() => {
    if (!ticket || !profileId) return false;
    
    // Creator can always change status
    if (ticket.created_by_user_id === profileId) return true;
    
    // Owner (internal responsible) can change status
    if (ticket.owner_user_id === profileId) return true;
    
    // For external tickets: assigned contact can change status (if they have a linked profile)
    if (ticket.type === 'external' && currentBuContactId && ticket.assigned_contact_id === currentBuContactId) {
      return true;
    }
    
    return false;
  }, [ticket, profileId, currentBuContactId]);

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
    await updateStatus.mutateAsync({ 
      id: ticket.id, 
      status: newStatus,
      context: {
        currentStatus: ticket.status,
        profileId,
      },
    });
  };

  const handleSendMessage = async (data: {
    content: string;
    mentions: ParsedMention[];
    files: File[];
    replyToMessageId?: string | null;
  }) => {
    if (!ticket) return;

    // Guard: if the user is not identified (session expired / logged out), avoid hitting the DB.
    // Internal user: needs profileId. External user: needs contactId for current BU.
    if (!profileId && !currentBuContactId) {
      toast.error("Sua sessão expirou. Faça login novamente.");
      return;
    }
    
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
          reply_to_message_id: data.replyToMessageId ?? null,
        },
      });
      toast.success("Mensagem enviada");
      // Clear reply state on success
      setReplyingTo(null);
    } catch (error) {
      // Prefer actionable messages over a generic toast.
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as any).message)
          : "";

      if (message.includes("NOT_AUTHENTICATED") || message.includes("NO_BU_CONTEXT")) {
        toast.error("Sua sessão expirou. Faça login novamente.");
      } else if (message.includes("BU não selecionada")) {
        toast.error("Selecione uma BU para enviar mensagens.");
      } else {
        toast.error("Erro ao enviar mensagem");
      }

      console.error("Failed to send ticket message:", error);
      throw error;
    }
  };

  const handleTransfer = async (candidate: {
    id: string;
    type: "internal" | "external";
    name: string;
    authUserId?: string | null;
  }) => {
    if (!ticket) return;

    // Get current responsible info
    const fromResponsible = ticket.type === "external" && ticket.assigned_contact
      ? {
          type: "external" as const,
          id: ticket.assigned_contact.id,
          name: ticket.assigned_contact.name || "Contato",
        }
      : ticket.owner
      ? {
          type: "internal" as const,
          id: ticket.owner.id,
          name: ticket.owner.display_name || "Alguém",
        }
      : null;

    if (!fromResponsible) {
      toast.error("Não foi possível identificar o responsável atual");
      return;
    }

    await transferTicket.mutateAsync({
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      ticketType: ticket.type,
      fromResponsible,
      toResponsible: {
        type: candidate.type,
        id: candidate.id,
        name: candidate.name,
        authUserId: candidate.authUserId,
      },
    });

    setTransferModalOpen(false);
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
          <PageHeader
            title="Erro ao carregar ticket"
            breadcrumbs={[
              { label: "Tickets", href: "/tickets" },
              { label: "Erro" },
            ]}
          />
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
          <PageHeader
            title="Ticket não encontrado"
            breadcrumbs={[
              { label: "Tickets", href: "/tickets" },
              { label: "Não encontrado" },
            ]}
          />
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
        {/* Header - usando componente especializado com breadcrumbs integrados */}
        <TicketDetailHeader
          title={ticket.title}
          type={ticket.type}
          status={ticket.status}
          createdAt={ticket.created_at}
          expectedDueAt={ticket.expected_due_at}
          ticketId={ticket.id}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Messages Thread */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Mensagens</CardTitle>
                {canPin && (
                  <span className="text-xs text-muted-foreground">
                    Dica: passe o mouse sobre uma mensagem para fixá-la
                  </span>
                )}
              </div>
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
                <>
                  {/* Pinned messages section */}
                  <PinnedMessagesSection
                    messages={messages}
                    attachmentsByMessage={attachmentsByMessage}
                    canPin={canPin}
                    onUnpin={(messageId) => pinMessage.mutate({ messageId, ticketId: ticket.id, pin: false })}
                    isUnpinning={pinMessage.isPending}
                  />
                  
                  <ScrollArea 
                    className="h-[calc(100vh-480px)] min-h-[200px] max-h-[600px] pr-4"
                    viewportRef={scrollViewportRef}
                  >
                    <div className="space-y-4">
                      {messages.filter(m => !m.is_pinned).map((message) => {
                        // Check if message is from current user (internal or external)
                        const isOwnMessage = isExternal
                          ? message.author_contact_id === currentBuContactId
                          : message.author_user_id === profileId;
                        const messageAttachments = attachmentsByMessage.get(message.id) || [];
                        
                        return (
                          <TicketMessageBubble
                            key={message.id}
                            message={message}
                            isOwnMessage={isOwnMessage}
                            attachments={messageAttachments}
                            canPin={canPin}
                            onTogglePin={(msgId, pin) => pinMessage.mutate({ messageId: msgId, ticketId: ticket.id, pin })}
                            isPinning={pinMessage.isPending}
                            onReply={(msg) => setReplyingTo(msg)}
                            onScrollToMessage={(messageId) => {
                              const el = document.getElementById(`message-${messageId}`);
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                el.classList.add('bg-accent/50');
                                setTimeout(() => el.classList.remove('bg-accent/50'), 2000);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}

              <Separator className="my-4" />

              {/* Message composer with mentions and file upload */}
              <TicketMessageComposer
                onSend={handleSendMessage}
                isSubmitting={createMessage.isPending}
                partnerCompanyId={ticket.type === "external" ? ticket.external_company_id : null}
                placeholder="Digite sua mensagem... Use @ para mencionar"
                buName={currentBu?.name}
                partnerCompanyName={ticket.type === "external" ? ticket.external_company?.name : undefined}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Details */}
        <TicketDetailSidebar
          ticketType={ticket.type}
          status={ticket.status}
          visibility={ticket.visibility}
          owner={ticket.owner}
          assignedContact={ticket.assigned_contact}
          createdBy={ticket.created_by}
          category={(ticket as any).category}
          subcategory={(ticket as any).subcategory}
          partnerCompany={ticket.type === "external" ? (ticket as any).partner_company : null}
          viewersData={viewersData}
          canChangeStatus={canChangeStatus}
          isUpdatingStatus={updateStatus.isPending}
          onStatusChange={handleStatusChange}
          onTransferClick={() => setTransferModalOpen(true)}
        />
      </div>

        {/* Transfer Modal */}
        <TicketTransferModal
          open={transferModalOpen}
          onOpenChange={setTransferModalOpen}
          ticketType={ticket.type}
          partnerCompanyId={ticket.external_company_id}
          currentResponsibleId={
            ticket.type === "external"
              ? ticket.assigned_contact?.id
              : ticket.owner?.id
          }
          onTransfer={handleTransfer}
          isTransferring={transferTicket.isPending}
        />
      </div>
    </HubLayout>
  );
}
