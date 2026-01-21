// ============================================================
// USE AVAILABLE EXTERNAL CONTACTS - Busca contatos para ticket externo
// ============================================================
// POST-BU: Usa cliente BU-scoped obrigatório
// TCR v2.15.0: Campos explícitos, queryKeys centralizadas
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

// ===========================================
// TYPES
// ===========================================

export interface AvailableExternalContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: "capability" | "fallback";
}

export interface AvailableExternalContactsResult {
  contacts: AvailableExternalContact[];
  source: "capability" | "fallback" | "none";
  isLoading: boolean;
}

// ===========================================
// HOOK: Contacts by Capability (Subcategory)
// ===========================================

/**
 * Busca contatos ativos que atendem uma subcategoria específica
 * via partner_contact_capabilities
 */
export function useContactsByCapability(
  partnerCompanyId: string | undefined,
  subcategoryId: string | undefined,
  categoryId: string | undefined
) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: [
      ...queryKeys.tickets.companyContactCapabilities(buId ?? null, partnerCompanyId),
      "by-subcategory",
      subcategoryId,
      categoryId,
    ],
    queryFn: async () => {
      if (!buId || !partnerCompanyId) return [];

      // Build query for capabilities
      let query = supabase
        .from("partner_contact_capabilities")
        .select(`
          id,
          contact_id,
          category_id,
          subcategory_id,
          contact:partner_contacts(id, name, email, phone, status)
        `)
        .eq("bu_id", buId)
        .eq("partner_company_id", partnerCompanyId)
        .eq("is_active", true)
        .is("deleted_at", null);

      // Filter by subcategory or generalist (subcategory_id IS NULL)
      if (subcategoryId) {
        // Match specific subcategory OR generalist for category
        query = query.or(`subcategory_id.eq.${subcategoryId},and(subcategory_id.is.null,category_id.eq.${categoryId})`);
      } else if (categoryId) {
        // Only generalists for the category
        query = query.eq("category_id", categoryId).is("subcategory_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Deduplicate contacts and filter active ones
      const contactMap = new Map<string, AvailableExternalContact>();
      
      for (const cap of data || []) {
        const contact = cap.contact as { id: string; name: string; email: string; phone: string | null; status: string } | null;
        if (contact && contact.status === "active" && !contactMap.has(contact.id)) {
          contactMap.set(contact.id, {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            source: "capability",
          });
        }
      }

      return Array.from(contactMap.values());
    },
    enabled: !!buId && !!partnerCompanyId && (!!subcategoryId || !!categoryId),
  });
}

// ===========================================
// HOOK: Company Fallback Contacts
// ===========================================

/**
 * Busca contatos padrão (fallback) configurados na associação empresa-BU
 */
export function useCompanyFallbackContacts(partnerCompanyId: string | undefined) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ["company-fallback-contacts", buId, partnerCompanyId],
    queryFn: async () => {
      if (!buId || !partnerCompanyId) return [];

      // 1. Get default_contact_ids from association
      const { data: association, error: assocError } = await supabase
        .from("partner_company_bu_associations")
        .select("default_contact_ids")
        .eq("bu_id", buId)
        .eq("partner_company_id", partnerCompanyId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (assocError) throw assocError;
      if (!association?.default_contact_ids?.length) return [];

      // 2. Get contact details
      const { data: contacts, error: contactsError } = await supabase
        .from("partner_contacts")
        .select("id, name, email, phone, status")
        .in("id", association.default_contact_ids)
        .eq("status", "active")
        .is("deleted_at", null);

      if (contactsError) throw contactsError;

      return (contacts || []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        source: "fallback" as const,
      }));
    },
    enabled: !!buId && !!partnerCompanyId,
  });
}

// ===========================================
// HOOK: Combined Available Contacts
// ===========================================

/**
 * Hook combinado que retorna contatos disponíveis para seleção
 * Prioriza contatos com capacidade na subcategoria, usa fallback se não encontrar
 */
export function useAvailableExternalContacts(
  partnerCompanyId: string | undefined,
  subcategoryId: string | undefined,
  categoryId: string | undefined
): AvailableExternalContactsResult {
  const capabilityQuery = useContactsByCapability(partnerCompanyId, subcategoryId, categoryId);
  const fallbackQuery = useCompanyFallbackContacts(partnerCompanyId);

  const isLoading = capabilityQuery.isLoading || fallbackQuery.isLoading;

  // If we have contacts by capability, use them
  if (capabilityQuery.data && capabilityQuery.data.length > 0) {
    return {
      contacts: capabilityQuery.data,
      source: "capability",
      isLoading,
    };
  }

  // Otherwise, use fallback contacts
  if (fallbackQuery.data && fallbackQuery.data.length > 0) {
    return {
      contacts: fallbackQuery.data,
      source: "fallback",
      isLoading,
    };
  }

  return {
    contacts: [],
    source: "none",
    isLoading,
  };
}

// ===========================================
// MUTATION: Update Fallback Contacts
// ===========================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useUpdateFallbackContacts() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      partnerCompanyId,
      contactIds,
    }: {
      partnerCompanyId: string;
      contactIds: string[];
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const { error } = await supabase
        .from("partner_company_bu_associations")
        .update({
          default_contact_ids: contactIds,
          updated_at: new Date().toISOString(),
        })
        .eq("bu_id", buId)
        .eq("partner_company_id", partnerCompanyId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["company-fallback-contacts", buId, variables.partnerCompanyId],
      });
      toast.success("Contatos padrão atualizados");
    },
    onError: (error) => {
      console.error("Error updating fallback contacts:", error);
      toast.error("Erro ao atualizar contatos padrão");
    },
  });
}
