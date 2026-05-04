import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useSafeBack } from "@/hooks/useSafeBack";
import { useAuth } from "@/hooks/useAuth";
import { useIdentity } from "@/hooks/useIdentity";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBu } from "@/contexts/BuContext";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useCreateTicket } from "@/modules/tickets/hooks";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import type { ParsedMention } from "@/components/mentions";
import { createTicketSchema, type CreateTicketFormData } from "./create-ticket/schema";
import { useTicketAttachments } from "./create-ticket/useTicketAttachments";
import { useTicketFormDerivations } from "./create-ticket/useTicketFormDerivations";
import { TypeSection } from "./create-ticket/sections/TypeSection";
import { BasicInfoSection } from "./create-ticket/sections/BasicInfoSection";
import { DueDateSection } from "./create-ticket/sections/DueDateSection";
import { MessageSection } from "./create-ticket/sections/MessageSection";

export default function CreateTicketPage() {
  usePageTitle("Novo Ticket", {
    pageType: "subpage",
    customDescription: "Crie um novo ticket interno ou externo e defina categoria, visibilidade e prazo.",
  });

  const navigate = useNavigate();
  const { isExternal, isLoading: isExternalLoading } = useExternalUser();

  useEffect(() => {
    if (!isExternalLoading && isExternal) {
      toast.error("Usuários externos não podem criar tickets");
      navigate("/tickets", { replace: true });
    }
  }, [isExternal, isExternalLoading, navigate]);

  const [searchParams] = useSearchParams();
  const goBack = useSafeBack({ moduleRoot: "/tickets" });
  const typeFromUrl = searchParams.get("type") as "internal" | "external" | null;

  const { currentBu } = useBu();
  useAuth();
  const { profileId, realProfileId } = useIdentity();
  // CRITICAL (Identity Convention): mutations must use realProfileId
  const createTicket = useCreateTicket(realProfileId);
  const supabase = useBuScopedSupabase();

  const [isUploading, setIsUploading] = useState(false);
  const [initialMessageMentions, setInitialMessageMentions] = useState<ParsedMention[]>([]);

  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      type: typeFromUrl === "external" ? "external" : "internal",
      title: "",
      initial_message: "",
      visibility: "private",
    },
  });

  const derivations = useTicketFormDerivations(form);
  const {
    selectedType,
    selectedPartnerId,
    selectedCategoryId,
    selectedSubcategoryId,
    internalRoutingMatch,
    selectedExternalContactId,
    setSelectedExternalContactId,
    externalContactSource,
    setExternalContactSource,
    contactsSource,
  } = derivations;

  const { attachments, fileInputRef, handleFileSelect, removeAttachment, uploadAttachments } =
    useTicketAttachments();

  const onSubmit = async (data: CreateTicketFormData) => {
    try {
      setIsUploading(true);

      const internalRouting =
        data.type === "internal" && internalRoutingMatch
          ? {
              ownerUserId: internalRoutingMatch.ownerUserId,
              participants: [
                ...internalRoutingMatch.assigneeUserIds.map((id) => ({
                  type: "internal_user" as const,
                  id,
                  role: "assignee" as const,
                })),
                ...internalRoutingMatch.watcherUserIds.map((id) => ({
                  type: "internal_user" as const,
                  id,
                  role: "watcher" as const,
                })),
              ],
            }
          : undefined;

      const ticket = await createTicket.mutateAsync({
        type: data.type,
        title: data.title,
        category_id: data.category_id || null,
        subcategory_id: data.subcategory_id || null,
        external_company_id:
          data.type === "external" ? data.external_company_id || null : null,
        assigned_contact_id: data.type === "external" ? selectedExternalContactId || null : null,
        assignment_source:
          data.type === "external" && selectedExternalContactId
            ? externalContactSource === "capability"
              ? "contact_capability"
              : "routing_fallback"
            : null,
        visibility: "private",
        visibility_team_ids: [],
        visibility_user_ids: [],
        expected_due_at: data.expected_due_at?.toISOString() || null,
        initial_message: data.initial_message
          ? { type: "text", content: data.initial_message }
          : undefined,
        initial_message_mentions: initialMessageMentions.map((m) => ({
          user_id: m.userId,
          contact_id: m.contactId,
        })),
        attachments,
        internalRouting,
      });

      if (attachments.length > 0 && ticket?.id && currentBu) {
        const uploaderProfileId = realProfileId ?? profileId;
        const { data: messages } = await supabase
          .from("ticket_messages")
          .select("id")
          .eq("ticket_id", ticket.id)
          .order("created_at", { ascending: true })
          .limit(1);
        if (messages && messages.length > 0 && uploaderProfileId) {
          await uploadAttachments(ticket.id, messages[0].id, currentBu.id, uploaderProfileId);
        }
      }

      navigate("/tickets");
    } catch (error) {
      console.error("[CreateTicketPage] Submit error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Novo Ticket</h2>
          <p className="text-sm text-muted-foreground">Crie uma nova demanda</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <TypeSection form={form} buName={currentBu?.name} />

          <BasicInfoSection
            form={form}
            selectedType={selectedType}
            selectedCategoryId={selectedCategoryId}
            selectedPartnerId={selectedPartnerId}
            selectedSubcategoryId={selectedSubcategoryId}
            filteredCategories={derivations.filteredCategories}
            partnersByCategory={derivations.partnersByCategory}
            loadingPartnersByCategory={derivations.loadingPartnersByCategory}
            partnerHasServices={derivations.partnerHasServices}
            loadingPartnerServices={derivations.loadingPartnerServices}
            availableSubcategories={derivations.availableSubcategories}
            isGeneralistCategory={derivations.isGeneralistCategory}
            availableContacts={derivations.availableContacts}
            contactsSource={derivations.contactsSource}
            loadingContacts={derivations.loadingContacts}
            selectedExternalContactId={selectedExternalContactId}
            onSelectExternalContact={(id) => {
              setSelectedExternalContactId(id);
              setExternalContactSource(contactsSource);
            }}
          />

          <DueDateSection form={form} />

          <MessageSection
            form={form}
            selectedType={selectedType}
            selectedPartnerId={selectedPartnerId}
            setInitialMessageMentions={setInitialMessageMentions}
            attachments={attachments}
            fileInputRef={fileInputRef}
            handleFileSelect={handleFileSelect}
            removeAttachment={removeAttachment}
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={goBack}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={createTicket.isPending || isUploading}
              loadingText="Criando..."
            >
              Criar Ticket
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
