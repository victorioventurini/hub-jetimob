// ============================================================
// USE CONTACT CAPABILITIES - Gerencia capacidades de contatos
// ============================================================
// POST-BU: Usa cliente BU-scoped obrigatório
// TCR v2.15.0: Campos explícitos, queryKeys centralizadas
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";

// ===========================================
// TYPES
// ===========================================

export interface ContactCapability {
  id: string;
  bu_id: string;
  partner_company_id: string;
  contact_id: string;
  category_id: string;
  subcategory_id: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  category?: { id: string; name: string } | null;
  subcategory?: { id: string; name: string } | null;
  contact?: { id: string; name: string; email: string } | null;
}

export interface CreateCapabilityData {
  contact_id: string;
  partner_company_id: string;
  category_id: string;
  subcategory_id?: string | null;
}

// Explicit fields - avoid select('*')
const CAPABILITY_FIELDS = `
  id, bu_id, partner_company_id, contact_id, category_id, subcategory_id,
  is_active, created_at, created_by, updated_at, deleted_at,
  category:ticket_categories(id, name),
  subcategory:ticket_subcategories(id, name)
`;

const CAPABILITY_WITH_CONTACT_FIELDS = `
  id, bu_id, partner_company_id, contact_id, category_id, subcategory_id,
  is_active, created_at, created_by, updated_at, deleted_at,
  category:ticket_categories(id, name),
  subcategory:ticket_subcategories(id, name),
  contact:partner_contacts(id, name, email)
`;

// ===========================================
// QUERIES
// ===========================================

export function useContactCapabilities(contactId?: string) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.contactCapabilities(buId ?? null, contactId),
    queryFn: async () => {
      if (!buId) return [];

      let query = supabase
        .from("partner_contact_capabilities")
        .select(CAPABILITY_FIELDS)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (contactId) {
        query = query.eq("contact_id", contactId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ContactCapability[];
    },
    enabled: !!buId,
  });
}

export function useCompanyContactCapabilities(companyId?: string) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.companyContactCapabilities(buId ?? null, companyId),
    queryFn: async () => {
      if (!buId || !companyId) return [];

      const { data, error } = await supabase
        .from("partner_contact_capabilities")
        .select(CAPABILITY_WITH_CONTACT_FIELDS)
        .eq("bu_id", buId)
        .eq("partner_company_id", companyId)
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ContactCapability[];
    },
    enabled: !!buId && !!companyId,
  });
}

// ===========================================
// MUTATIONS
// ===========================================

export function useCreateContactCapability() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const { profile } = useAuth();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: CreateCapabilityData) => {
      if (!buId) throw new Error("BU não selecionada");

      const { data: capability, error } = await supabase
        .from("partner_contact_capabilities")
        .insert({
          bu_id: buId,
          partner_company_id: data.partner_company_id,
          contact_id: data.contact_id,
          category_id: data.category_id,
          subcategory_id: data.subcategory_id || null,
          created_by: profile?.id || null,
        })
        .select("id, bu_id, partner_company_id, contact_id, category_id, subcategory_id, is_active, created_at")
        .single();

      if (error) throw error;
      return capability;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.contactCapabilities(null, undefined) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.companyContactCapabilities(null, undefined) });
    },
  });
}

export function useDeleteContactCapability() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_contact_capabilities")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.contactCapabilities(null, undefined) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.companyContactCapabilities(null, undefined) });
    },
  });
}

export function useToggleContactCapability() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("partner_contact_capabilities")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.contactCapabilities(null, undefined) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.companyContactCapabilities(null, undefined) });
    },
  });
}

export function useUpdateContactCapability() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      category_id,
      subcategory_id,
    }: {
      id: string;
      category_id: string;
      subcategory_id: string | null;
    }) => {
      const { error } = await supabase
        .from("partner_contact_capabilities")
        .update({ category_id, subcategory_id })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.contactCapabilities(null, undefined) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.companyContactCapabilities(null, undefined) });
    },
  });
}

/**
 * Bulk save contact capabilities - replaces all capabilities for a contact
 * with the provided selections.
 */
export function useSaveContactCapabilities() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const { profile } = useAuth();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      contactId,
      companyId,
      selections,
    }: {
      contactId: string;
      companyId: string;
      selections: Array<{
        categoryId: string;
        isGeneralist: boolean;
        subcategoryIds: string[];
      }>;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      // 1. Soft-delete all existing capabilities for this contact
      await supabase
        .from("partner_contact_capabilities")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("bu_id", buId)
        .eq("contact_id", contactId)
        .is("deleted_at", null);

      // 2. Build the new capabilities to insert
      const newCapabilities: Array<{
        bu_id: string;
        partner_company_id: string;
        contact_id: string;
        category_id: string;
        subcategory_id: string | null;
        created_by: string | null;
      }> = [];

      for (const selection of selections) {
        if (selection.isGeneralist) {
          // Generalist: one record with subcategory_id = null
          newCapabilities.push({
            bu_id: buId,
            partner_company_id: companyId,
            contact_id: contactId,
            category_id: selection.categoryId,
            subcategory_id: null,
            created_by: profile?.id || null,
          });
        } else if (selection.subcategoryIds.length > 0) {
          // Specific subcategories
          for (const subId of selection.subcategoryIds) {
            newCapabilities.push({
              bu_id: buId,
              partner_company_id: companyId,
              contact_id: contactId,
              category_id: selection.categoryId,
              subcategory_id: subId,
              created_by: profile?.id || null,
            });
          }
        }
      }

      // 3. Insert new capabilities if any
      if (newCapabilities.length > 0) {
        const { error } = await supabase
          .from("partner_contact_capabilities")
          .insert(newCapabilities);

        if (error) throw error;
      }

      return { count: newCapabilities.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.contactCapabilitiesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.companyContactCapabilitiesPrefix() });
    },
  });
}
