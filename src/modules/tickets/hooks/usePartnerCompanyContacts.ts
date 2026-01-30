/**
 * usePartnerCompanyContacts - Hook canônico para listar contatos de uma empresa parceira
 * 
 * POST-BU: Usa cliente BU-scoped obrigatório
 * TCR v2.15.0: Campos explícitos, queryKeys centralizadas
 * 
 * Casos de uso:
 * - TicketTransferModal: listar contatos da mesma empresa para transferência
 * - TicketResponsibleSelect: listar contatos externos para filtro
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

// ===========================================
// TYPES
// ===========================================

export interface PartnerContactListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** auth.users.id (partner_contacts.user_id) para notificações */
  authUserId: string | null;
}

interface UsePartnerCompanyContactsOptions {
  /** Filter by specific partner company */
  partnerCompanyId?: string | null;
  /** Search query for filtering by name/email */
  q?: string;
  /** Enable/disable the query */
  enabled?: boolean;
}

// ===========================================
// HOOK
// ===========================================

/**
 * Hook canônico para listar contatos ativos de uma empresa parceira.
 * 
 * Busca via partner_contact_bu_associations para garantir:
 * - Contato está ativo na BU
 * - Contato pertence à empresa especificada
 * - Association não está deletada
 */
export function usePartnerCompanyContacts(options: UsePartnerCompanyContactsOptions = {}) {
  const { partnerCompanyId, q, enabled = true } = options;
  
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: [
      ...queryKeys.tickets.partnerContacts(buId ?? null, partnerCompanyId ?? undefined),
      "list",
      q,
    ],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    queryFn: async (): Promise<PartnerContactListItem[]> => {
      if (!buId || !partnerCompanyId) return [];

      // Query contacts from partner company via associations
      const { data: associations, error } = await supabase
        .from("partner_contact_bu_associations")
        .select(`
          id,
          partner_contact:partner_contacts!inner (
            id,
            name,
            email,
            phone,
            user_id,
            partner_company_id,
            status
          )
        `)
        .eq("bu_id", buId)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (error) {
        console.error("[usePartnerCompanyContacts] Error loading contacts:", error);
        throw error;
      }

      // Flatten, filter by company, and filter active contacts
      const contacts = (associations || [])
        .map((a) => a.partner_contact)
        .filter((c): c is NonNullable<typeof c> => 
          c !== null && 
          c.partner_company_id === partnerCompanyId &&
          c.status === "active"
        );

      // Filter by search query
      const filteredContacts = q
        ? contacts.filter((c) => {
            const searchLower = q.toLowerCase();
            return (
              c.name?.toLowerCase().includes(searchLower) ||
              c.email?.toLowerCase().includes(searchLower)
            );
          })
        : contacts;

      // Map to standard interface
      return filteredContacts.map((c) => ({
        id: c.id,
        name: c.name || "Sem nome",
        email: c.email || "",
        phone: c.phone ?? null,
        authUserId: c.user_id ?? null,
      }));
    },
    enabled: enabled && !!buId && !!partnerCompanyId,
  });
}
