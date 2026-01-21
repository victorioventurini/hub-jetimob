/**
 * Ticket Query Hooks
 * 
 * React Query hooks for fetching ticket data.
 * Follows project standards: explicit field selection, staleTime, BU scoping.
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import { queryKeys } from "@/lib/queryKeys";
import { TICKET_FIELDS, TICKET_STALE_TIME, DEFAULT_LIMIT } from "./ticketFieldDefinitions";
import { fetchMessagesCounts, fetchMentions, normalizeTicketRelations } from "./ticketQueryUtils";
import type { Ticket, TicketFilters } from "../types";

// ===========================================
// LIST QUERY
// ===========================================

/**
 * Hook para buscar tickets (limite alto, busca fluida)
 */
export function useTickets(filters?: TicketFilters) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();

  return useQuery({
    queryKey: queryKeys.tickets.list(buId ?? null, { ...filters, impersonatedUserId: isImpersonating ? impersonatedUserId : undefined } as Record<string, unknown>),
    staleTime: TICKET_STALE_TIME.list,
    queryFn: async (): Promise<Ticket[]> => {
      if (!buId) return [];

      // Durante impersonação, primeiro obter IDs de tickets visíveis
      let visibleTicketIds: string[] | null = null;
      if (isImpersonating && impersonatedUserId) {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc("get_visible_ticket_ids_for_impersonation", {
            p_impersonated_profile_id: impersonatedUserId,
          });
        
        if (rpcError) throw rpcError;
        visibleTicketIds = (rpcResult || []).map((r: { ticket_id: string }) => r.ticket_id);
        
        if (visibleTicketIds.length === 0) return [];
      }

      let query = supabase
        .from("tickets")
        .select(TICKET_FIELDS.ticketList)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(DEFAULT_LIMIT);

      // Durante impersonação, filtrar apenas tickets visíveis
      if (visibleTicketIds !== null) {
        query = query.in("id", visibleTicketIds);
      }

      // Apply filters
      if (filters?.type) {
        query = query.eq("type", filters.type);
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.category_id) {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters?.subcategory_id) {
        query = query.eq("subcategory_id", filters.subcategory_id);
      }

      if (filters?.partner_company_id) {
        query = query.eq("partner_company_id", filters.partner_company_id);
      }

      if (filters?.owner_user_id) {
        query = query.eq("owner_user_id", filters.owner_user_id);
      }

      if (filters?.assigned_contact_id) {
        query = query.eq("assigned_contact_id", filters.assigned_contact_id);
      }

      if (filters?.created_by_user_id) {
        query = query.eq("created_by_user_id", filters.created_by_user_id);
      }

      if (filters?.overdue) {
        query = query
          .lt("expected_due_at", new Date().toISOString())
          .not("status", "in", "(done,discarded)");
      }

      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const ticketIds = data.map(t => t.id);

      // Batch fetch related data
      const [messagesMap, mentionsMap] = await Promise.all([
        fetchMessagesCounts(supabase, ticketIds),
        fetchMentions(supabase, ticketIds),
      ]);

      return data.map((ticket) => normalizeTicketRelations(ticket, messagesMap, mentionsMap));
    },
    enabled: !!buId,
  });
}

// ===========================================
// DETAIL QUERY
// ===========================================

/**
 * Hook para buscar um ticket específico
 */
export function useTicket(ticketId: string | null) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();

  return useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    staleTime: TICKET_STALE_TIME.detail,
    queryFn: async () => {
      if (!ticketId) return null;

      // Durante impersonação, verificar se o usuário impersonado pode ver o ticket
      if (isImpersonating && impersonatedUserId) {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc("get_ticket_for_impersonation", {
            p_ticket_id: ticketId,
            p_impersonated_profile_id: impersonatedUserId,
          });

        if (rpcError) throw rpcError;

        if (!rpcResult || rpcResult.length === 0 || !rpcResult[0]?.can_view) {
          return null;
        }
      }

      const { data, error } = await supabase
        .from("tickets")
        .select(TICKET_FIELDS.ticketDetail)
        .eq("id", ticketId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        return normalizeTicketRelations(data);
      }
      return null;
    },
    enabled: !!ticketId && !!buId,
  });
}

// ===========================================
// MY TICKETS QUERY
// ===========================================

/**
 * Hook para buscar tickets do usuário atual
 */
export function useMyTickets() {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();
  const { profileId, isReady } = useIdentity();

  return useQuery({
    queryKey: queryKeys.tickets.myTickets(buId ?? null, profileId ?? undefined),
    staleTime: TICKET_STALE_TIME.list,
    queryFn: async (): Promise<Ticket[]> => {
      if (!buId || !profileId) return [];

      const { data, error } = await supabase
        .from("tickets")
        .select(TICKET_FIELDS.ticketList)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .or(`created_by_user_id.eq.${profileId},owner_user_id.eq.${profileId}`)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const ticketIds = data.map(t => t.id);

      // Batch fetch related data
      const [messagesMap, mentionsMap] = await Promise.all([
        fetchMessagesCounts(supabase, ticketIds),
        fetchMentions(supabase, ticketIds),
      ]);

      return data.map((ticket) => normalizeTicketRelations(ticket, messagesMap, mentionsMap));
    },
    enabled: !!buId && isReady,
  });
}
