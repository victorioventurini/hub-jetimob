import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";

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

// ===========================================
// QUERIES
// ===========================================

export function useContactCapabilities(contactId?: string) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: ["contact-capabilities", buId, contactId],
    queryFn: async () => {
      if (!buId) return [];

      let query = supabase
        .from("partner_contact_capabilities")
        .select(`
          *,
          category:ticket_categories(id, name),
          subcategory:ticket_subcategories(id, name)
        `)
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

  return useQuery({
    queryKey: ["company-contact-capabilities", buId, companyId],
    queryFn: async () => {
      if (!buId || !companyId) return [];

      const { data, error } = await supabase
        .from("partner_contact_capabilities")
        .select(`
          *,
          category:ticket_categories(id, name),
          subcategory:ticket_subcategories(id, name),
          contact:partner_contacts(id, name, email)
        `)
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
  const buId = currentBu?.id;

  return useMutation({
    mutationFn: async (data: CreateCapabilityData) => {
      if (!buId) throw new Error("BU não selecionada");

      const { data: { user } } = await supabase.auth.getUser();

      const { data: capability, error } = await supabase
        .from("partner_contact_capabilities")
        .insert({
          bu_id: buId,
          partner_company_id: data.partner_company_id,
          contact_id: data.contact_id,
          category_id: data.category_id,
          subcategory_id: data.subcategory_id || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return capability;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-capabilities"] });
      queryClient.invalidateQueries({ queryKey: ["company-contact-capabilities"] });
    },
  });
}

export function useDeleteContactCapability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_contact_capabilities")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-capabilities"] });
      queryClient.invalidateQueries({ queryKey: ["company-contact-capabilities"] });
    },
  });
}

export function useToggleContactCapability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("partner_contact_capabilities")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-capabilities"] });
      queryClient.invalidateQueries({ queryKey: ["company-contact-capabilities"] });
    },
  });
}

export function useUpdateContactCapability() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["contact-capabilities"] });
      queryClient.invalidateQueries({ queryKey: ["company-contact-capabilities"] });
    },
  });
}
