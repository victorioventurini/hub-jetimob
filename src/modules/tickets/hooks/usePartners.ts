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

  return useQuery<PartnerCompany[]>({
    queryKey: queryKeys.tickets.partners(buId ?? null),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PartnerCompany[]> => {
      if (!buId) return [];

      const { data, error } = await supabase
        .from("external_company_bu_associations")
        .select(`
          external_company:external_companies(
            id, name, legal_name, person_type, document, document_type,
            allowed_domains, status, notes, created_at, created_by, updated_at, deleted_at
          )
        `)
        .eq("bu_id", buId)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (error) throw error;
      
      const partners = (data || [])
        .map((row) => (row as { external_company: PartnerCompany | null }).external_company)
        .filter((p): p is NonNullable<typeof p> => p !== null && p.deleted_at === null)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      return partners;
    },
    enabled: !!buId,
  });
}

export function usePartnerCompany(id: string | null) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.tickets.partnerCompany(id),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("external_companies")
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
      person_type?: 'pf' | 'pj';
      document?: string | null;
      document_type?: 'cpf' | 'cnpj' | null;
      allowed_domains?: string[];
      status?: PartnerCompanyStatus;
      notes?: string | null;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const { data: { user } } = await supabase.auth.getUser();

      const { data: company, error } = await supabase
        .from("external_companies")
        .insert({
          bu_id: null,
          name: data.name,
          legal_name: data.legal_name || null,
          person_type: data.person_type || 'pj',
          document: data.document?.replace(/\D/g, '') || null,
          document_type: data.document_type || null,
          allowed_domains: data.allowed_domains || [],
          status: data.status || "active",
          notes: data.notes || null,
          created_by: user?.id,
        })
        .select("id, name, legal_name, person_type, document, document_type, allowed_domains, status, notes, created_at, created_by, updated_at, deleted_at")
        .single();

      if (error) throw error;

      const { error: assocError } = await supabase
        .from("external_company_bu_associations")
        .insert({
          external_company_id: company.id,
          bu_id: buId,
          is_active: true,
        });

      if (assocError) {
        console.error("[useCreatePartnerCompany] Failed to create BU association:", assocError);
      }

      return company as PartnerCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partners(buId ?? null) });
    },
  });
}

export function useUpdatePartnerCompany() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      legal_name?: string | null;
      person_type?: 'pf' | 'pj';
      document?: string | null;
      document_type?: 'cpf' | 'cnpj' | null;
      allowed_domains?: string[];
      status?: PartnerCompanyStatus;
      notes?: string | null;
    }) => {
      const updateData = {
        ...data,
        document: data.document?.replace(/\D/g, '') || null,
        updated_at: new Date().toISOString(),
      };

      const { data: company, error } = await supabase
        .from("external_companies")
        .update(updateData)
        .eq("id", id)
        .select("id, name, legal_name, person_type, document, document_type, allowed_domains, status, notes, created_at, created_by, updated_at, deleted_at")
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
        .from("external_companies")
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
    queryKey: queryKeys.tickets.partnerContacts(buId ?? null, companyId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!buId) return [];

      const { data: associations, error: assocError } = await supabase
        .from("partner_contact_bu_associations")
        .select(`
          id,
          is_active,
          partner_contact:partner_contacts!inner (
            id, bu_id, external_company_id, name, email, phone, status, created_at, updated_at,
            external_company:external_companies(id, name)
          )
        `)
        .eq("bu_id", buId)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (assocError) {
        console.error("[usePartnerContacts] Error querying associations:", assocError);
        let query = supabase
          .from("partner_contacts")
          .select(`
            id, bu_id, external_company_id, name, email, phone, status, created_at, updated_at,
            external_company:external_companies(id, name)
          `)
          .eq("bu_id", buId)
          .is("deleted_at", null)
          .order("name");

        if (companyId) {
          query = query.eq("external_company_id", companyId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as unknown as PartnerContact[];
      }

      let contacts = (associations || [])
        .map((a) => (a as { partner_contact: PartnerContact }).partner_contact)
        .filter((c): c is NonNullable<typeof c> => c !== null && c.status === "active");

      if (companyId) {
        contacts = contacts.filter((c) => c.external_company_id === companyId);
      }

      contacts.sort((a, b) => a.name.localeCompare(b.name));

      return contacts;
    },
    enabled: !!buId,
  });
}

export function usePartnerContact(id: string | null) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.tickets.partnerContact(id),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("partner_contacts")
        .select(`
          id, bu_id, external_company_id, name, email, phone, status, created_at, updated_at,
          external_company:external_companies(id, name)
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
      external_company_id: string;
      name: string;
      email: string;
      phone?: string | null;
      status?: PartnerContactStatus;
      sendInvite?: boolean;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const { data: { user } } = await supabase.auth.getUser();

      const { data: contact, error } = await supabase
        .from("partner_contacts")
        .insert({
          bu_id: buId,
          external_company_id: data.external_company_id,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          status: data.status || "active",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      const shouldSendInvite = data.sendInvite !== false;
      if (shouldSendInvite && contact) {
        try {
          const { data: session } = await supabase.auth.getSession();
          await supabase.functions.invoke("send-partner-invite", {
            body: { contact_id: contact.id, bu_id: buId },
            headers: { Authorization: `Bearer ${session.session?.access_token}` },
          });
        } catch (inviteError) {
          console.warn("[useCreatePartnerContact] Invite error:", inviteError);
        }
      }

      return contact as PartnerContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.partnerContacts(buId ?? null, undefined),
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
    mutationFn: async ({ id, ...data }: {
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
        queryKey: queryKeys.tickets.partnerContacts(buId ?? null, undefined),
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partnerContact(variables.id) });
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
        queryKey: queryKeys.tickets.partnerContacts(buId ?? null, undefined),
        exact: false 
      });
    },
  });
}
