import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { PartnerCompany, PartnerContact, PartnerCompanyStatus, PartnerContactStatus } from "../types";

// ===========================================
// PARTNER COMPANIES
// ===========================================

export function usePartnerCompanies() {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.partners(buId ?? null),
    queryFn: async () => {
      if (!buId) return [];

      const { data, error } = await supabase
        .from("partner_companies")
        .select("id, bu_id, name, legal_name, allowed_domains, status, notes, created_at, created_by, updated_at, deleted_at")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data as PartnerCompany[];
    },
    enabled: !!buId,
  });
}

export function usePartnerCompany(id: string | null) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.tickets.partnerCompany(id),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("partner_companies")
        .select("id, bu_id, name, legal_name, allowed_domains, status, notes, created_at, created_by, updated_at, deleted_at")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data as PartnerCompany | null;
    },
    enabled: !!id,
  });
}

export function useCreatePartnerCompany() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      legal_name?: string | null;
      allowed_domains?: string[];
      status?: PartnerCompanyStatus;
      notes?: string | null;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: company, error } = await supabase
        .from("partner_companies")
        .insert({
          bu_id: buId,
          name: data.name,
          legal_name: data.legal_name || null,
          allowed_domains: data.allowed_domains || [],
          status: data.status || "active",
          notes: data.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return company as PartnerCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partners(null) });
    },
  });
}

export function useUpdatePartnerCompany() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      legal_name?: string | null;
      allowed_domains?: string[];
      status?: PartnerCompanyStatus;
      notes?: string | null;
    }) => {
      const { data: company, error } = await supabase
        .from("partner_companies")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return company as PartnerCompany;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partners(buId ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerCompany(variables.id) });
    },
  });
}

export function useDeletePartnerCompany() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_companies")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partners(buId ?? null) });
    },
  });
}

// ===========================================
// PARTNER CONTACTS
// ===========================================

export function usePartnerContacts(companyId?: string) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ["partner-contacts", buId, companyId],
    queryFn: async () => {
      if (!buId) return [];

      let query = supabase
        .from("partner_contacts")
        .select(`
          *,
          partner_company:partner_companies(id, name)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("name");

      if (companyId) {
        query = query.eq("partner_company_id", companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as PartnerContact[];
    },
    enabled: !!buId,
  });
}

export function usePartnerContact(id: string | null) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ["partner-contact", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("partner_contacts")
        .select(`
          *,
          partner_company:partner_companies(id, name)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as PartnerContact | null;
    },
    enabled: !!id,
  });
}

export function useCreatePartnerContact() {
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: contact, error } = await supabase
        .from("partner_contacts")
        .insert({
          bu_id: buId,
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

      // Send invitation email if requested (default: true)
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
            console.warn("[useCreatePartnerContact] Failed to send invite:", response.error);
          } else {
            console.log("[useCreatePartnerContact] Invite sent successfully");
          }
        } catch (inviteError) {
          // Don't fail the mutation if invite fails
          console.warn("[useCreatePartnerContact] Invite error:", inviteError);
        }
      }

      return contact as PartnerContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['partner-contacts', buId],
        exact: false 
      });
    },
  });
}

export function useUpdatePartnerContact() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      email?: string;
      phone?: string | null;
      status?: PartnerContactStatus;
    }) => {
      const updateData = { ...data };
      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase();
      }

      const { data: contact, error } = await supabase
        .from("partner_contacts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return contact as PartnerContact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['partner-contacts', buId],
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: ["partner-contact", variables.id] });
    },
  });
}

export function useDeletePartnerContact() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_contacts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['partner-contacts', buId],
        exact: false 
      });
    },
  });
}
