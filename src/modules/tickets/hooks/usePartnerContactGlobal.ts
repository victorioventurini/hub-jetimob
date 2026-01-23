/**
 * Hooks for global partner contact management
 * 
 * These hooks support the global email identity model where:
 * - partner_contacts are unique by email globally
 * - partner_contact_bu_associations links contacts to BUs
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { supabase as globalSupabase } from "@/integrations/supabase/globalClient";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type { PartnerContact, PartnerContactStatus } from "../types";

export interface PartnerContactWithAssociations extends PartnerContact {
  associations?: {
    id: string;
    bu_id: string;
    is_active: boolean;
    bu_name?: string;
  }[];
}

export interface ContactBuAssociation {
  id: string;
  partner_contact_id: string;
  bu_id: string;
  is_active: boolean;
  created_at: string;
  bu_units?: {
    id: string;
    name: string;
  };
}

/**
 * Check if a contact exists globally by email
 * Uses global supabase client since this is a pre-BU check
 */
export function useCheckContactByEmail(email: string | null) {
  return useQuery({
    queryKey: queryKeys.tickets.partnerContactByEmail(email),
    queryFn: async (): Promise<PartnerContactWithAssociations | null> => {
      if (!email) return null;

      const normalizedEmail = email.toLowerCase().trim();
      if (!normalizedEmail || !normalizedEmail.includes("@")) return null;

      // Query global contact by email
      const { data: contact, error } = await globalSupabase
        .from("partner_contacts")
        .select(`
          id, bu_id, partner_company_id, profile_user_id,
          name, email, phone, status,
          created_at, updated_at,
          partner_company:partner_companies(id, name)
        `)
        .eq("email", normalizedEmail)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        console.error("[useCheckContactByEmail] Error:", error);
        return null;
      }

      if (!contact) return null;

      // Get all BU associations for this contact
      const { data: associations, error: assocError } = await globalSupabase
        .from("partner_contact_bu_associations")
        .select(`
          id, bu_id, is_active, created_at,
          bu_units(id, name)
        `)
        .eq("partner_contact_id", contact.id)
        .is("deleted_at", null);

      if (assocError) {
        console.error("[useCheckContactByEmail] Association error:", assocError);
      }

      return {
        ...contact,
        associations: (associations || []).map(a => ({
          id: a.id,
          bu_id: a.bu_id,
          is_active: a.is_active,
          bu_name: (a.bu_units as { id: string; name: string } | null)?.name,
        })),
      } as PartnerContactWithAssociations;
    },
    enabled: !!email && email.includes("@"),
    staleTime: 0, // Always refetch for fresh data
  });
}

/**
 * Get BU associations for a contact
 */
export function useContactBuAssociations(contactId: string | null) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.partnerContactBuAssociations(contactId),
    queryFn: async (): Promise<ContactBuAssociation[]> => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from("partner_contact_bu_associations")
        .select(`
          id, partner_contact_id, bu_id, is_active, created_at,
          bu_units(id, name)
        `)
        .eq("partner_contact_id", contactId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ContactBuAssociation[];
    },
    enabled: !!contactId,
  });
}

/**
 * Activate an existing contact in the current BU
 * Creates a new association record
 */
export function useActivateContactInBu() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: {
      contactId: string;
      sendInvite?: boolean;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const { data: { user } } = await supabase.auth.getUser();

      // Check if association already exists
      const { data: existing } = await supabase
        .from("partner_contact_bu_associations")
        .select("id, is_active, deleted_at")
        .eq("partner_contact_id", data.contactId)
        .eq("bu_id", buId)
        .maybeSingle();

      if (existing) {
        if (existing.deleted_at) {
          // Reactivate soft-deleted association
          const { error } = await supabase
            .from("partner_contact_bu_associations")
            .update({
              is_active: true,
              deleted_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) throw error;
        } else if (!existing.is_active) {
          // Reactivate inactive association
          const { error } = await supabase
            .from("partner_contact_bu_associations")
            .update({
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          throw new Error("Contato já está ativo nesta BU");
        }
      } else {
        // Create new association
        const { error } = await supabase
          .from("partner_contact_bu_associations")
          .insert({
            partner_contact_id: data.contactId,
            bu_id: buId,
            is_active: true,
            created_by: user?.id,
          });

        if (error) throw error;
      }

      // Send invitation if requested
      const shouldSendInvite = data.sendInvite !== false;
      if (shouldSendInvite) {
        try {
          const { data: session } = await supabase.auth.getSession();
          const response = await supabase.functions.invoke("send-partner-invite", {
            body: {
              contact_id: data.contactId,
              bu_id: buId,
            },
            headers: {
              Authorization: `Bearer ${session.session?.access_token}`,
            },
          });

          if (response.error) {
            console.warn("[useActivateContactInBu] Failed to send invite:", response.error);
          }
        } catch (inviteError) {
          console.warn("[useActivateContactInBu] Invite error:", inviteError);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Contato ativado nesta BU");
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.partnerContacts(buId ?? null, undefined),
        exact: false,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao ativar contato");
    },
  });
}

/**
 * Create a new global contact and associate with current BU
 */
export function useCreateGlobalContact() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: {
      partner_company_id: string;
      name: string;
      email: string;
      phone?: string | null;
      status?: PartnerContactStatus;
      sendInvite?: boolean;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const { data: { user } } = await supabase.auth.getUser();

      // 1. Create global contact (no bu_id, will be associated via junction table)
      const { data: contact, error } = await supabase
        .from("partner_contacts")
        .insert({
          bu_id: buId, // Keep for backward compat, will be migrated later
          partner_company_id: data.partner_company_id,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          status: data.status || "active",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Create BU association
      const { error: assocError } = await supabase
        .from("partner_contact_bu_associations")
        .insert({
          partner_contact_id: contact.id,
          bu_id: buId,
          is_active: data.status === "active",
          created_by: user?.id,
        });

      if (assocError) {
        console.error("[useCreateGlobalContact] Failed to create BU association:", assocError);
        // Don't fail - contact was created
      }

      // 3. Send invitation if requested
      const shouldSendInvite = data.sendInvite !== false;
      if (shouldSendInvite && contact) {
        try {
          const { data: session } = await supabase.auth.getSession();
          const response = await supabase.functions.invoke("send-partner-invite", {
            body: {
              contact_id: contact.id,
              bu_id: buId,
            },
            headers: {
              Authorization: `Bearer ${session.session?.access_token}`,
            },
          });

          if (response.error) {
            console.warn("[useCreateGlobalContact] Failed to send invite:", response.error);
          }
        } catch (inviteError) {
          console.warn("[useCreateGlobalContact] Invite error:", inviteError);
        }
      }

      return contact as PartnerContact;
    },
    onSuccess: () => {
      toast.success("Contato criado com sucesso");
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.partnerContacts(buId ?? null, undefined),
        exact: false,
      });
    },
    onError: (error: Error) => {
      const message = error.message.includes("partner_contacts_email_global_unique")
        ? "Este email já está cadastrado no sistema"
        : error.message || "Erro ao criar contato";
      toast.error(message);
    },
  });
}

/**
 * Deactivate contact in current BU (soft delete the association)
 */
export function useDeactivateContactInBu() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!buId) throw new Error("BU não selecionada");

      // Soft delete the association
      const { error } = await supabase
        .from("partner_contact_bu_associations")
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq("partner_contact_id", contactId)
        .eq("bu_id", buId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato removido desta BU");
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.partnerContacts(buId ?? null, undefined),
        exact: false,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover contato");
    },
  });
}
