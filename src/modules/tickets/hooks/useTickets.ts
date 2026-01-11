import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { queryKeys } from "@/lib/queryKeys";
import type {
  Ticket,
  TicketFilters,
  CreateTicketData,
  UpdateTicketData,
  TicketStatus,
  PaginatedTicketsResponse,
} from "../types";

// ===========================================
// CONSTANTS
// ===========================================

const DEFAULT_PAGE_SIZE = 25;

// ===========================================
// QUERIES
// ===========================================

/**
 * Hook para buscar tickets com paginação server-side
 * @param filters - Filtros incluindo page e pageSize
 * @returns Dados paginados com total count
 */
export function useTickets(filters?: TicketFilters) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  // Pagination defaults
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return useQuery({
    queryKey: queryKeys.tickets.list(buId ?? null, filters as Record<string, unknown>),
    queryFn: async (): Promise<PaginatedTicketsResponse> => {
      if (!buId) return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };

      // Build base query with explicit fields (no select('*'))
      let query = supabase
        .from("tickets")
        .select(`
          id,
          bu_id,
          type,
          title,
          status,
          expected_due_at,
          created_by_user_id,
          owner_user_id,
          visibility,
          partner_company_id,
          category_id,
          subcategory_id,
          created_at,
          updated_at,
          partner_company:partner_companies(id, name),
          category:ticket_categories(id, name),
          subcategory:ticket_subcategories(id, name)
        `, { count: 'exact' })
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

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

      // Apply pagination
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const total = count ?? 0;

      return {
        data: data as Ticket[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    enabled: !!buId,
  });
}

export function useTicket(ticketId: string | null) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: async () => {
      if (!ticketId) return null;

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          partner_company:partner_companies(id, name),
          category:ticket_categories(id, name),
          subcategory:ticket_subcategories(id, name),
          assigned_contact:partner_contacts!tickets_assigned_contact_id_fkey(id, name, email)
        `)
        .eq("id", ticketId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Ticket | null;
    },
    enabled: !!ticketId && !!buId,
  });
}

export function useMyTickets() {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();
  const { profileId, isReady } = useIdentity();

  return useQuery({
    queryKey: queryKeys.tickets.myTickets(buId ?? null, profileId ?? undefined),
    queryFn: async () => {
      if (!buId || !profileId) return [];

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          category:ticket_categories(id, name)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .or(`created_by_user_id.eq.${profileId},owner_user_id.eq.${profileId}`)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return data as Ticket[];
    },
    enabled: !!buId && isReady,
  });
}

// ===========================================
// MUTATIONS
// ===========================================

export function useCreateTicket(profileId: string | null) {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: CreateTicketData) => {
      if (!buId) throw new Error("BU não selecionada");
      if (!profileId) throw new Error("Perfil não carregado");

      // Create ticket with profileId (profiles.id)
      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          bu_id: buId,
          type: data.type,
          title: data.title,
          category_id: data.category_id || null,
          subcategory_id: data.subcategory_id || null,
          partner_company_id: data.partner_company_id || null,
          visibility: data.visibility,
          visibility_team_ids: data.visibility_team_ids || [],
          visibility_squad_ids: data.visibility_squad_ids || [],
          visibility_user_ids: data.visibility_user_ids || [],
          expected_due_at: data.expected_due_at || null,
          created_by_user_id: profileId,
          owner_user_id: profileId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as requester participant with profileId
      await supabase.from("ticket_participants").insert({
        bu_id: buId,
        ticket_id: ticket.id,
        participant_type: "internal_user" as const,
        user_id: profileId,
        role: "requester" as const,
      });

      // Add initial message if provided with profileId
      if (data.initial_message && Object.keys(data.initial_message).length > 0) {
        const { data: message, error: messageError } = await supabase
          .from("ticket_messages")
          .insert({
            bu_id: buId,
            ticket_id: ticket.id,
            author_type: "internal_user" as const,
            author_user_id: profileId,
            body_richtext: data.initial_message,
          } as any)
          .select("id")
          .single();

        // Insert mentions for initial message
        if (!messageError && message && data.initial_message_mentions && data.initial_message_mentions.length > 0) {
          const mentionInserts = data.initial_message_mentions
            .filter((m) => m.user_id || m.contact_id)
            .map((m) => ({
              bu_id: buId,
              ticket_id: ticket.id,
              message_id: message.id,
              mentioned_user_id: m.user_id || null,
              mentioned_contact_id: m.contact_id || null,
            }));

          if (mentionInserts.length > 0) {
            await supabase.from("ticket_mentions").insert(mentionInserts);
          }
        }
      }

      // Add additional participants
      if (data.participants && data.participants.length > 0) {
        const participantInserts = data.participants.map((p) => ({
          bu_id: buId,
          ticket_id: ticket.id,
          participant_type: p.type,
          user_id: p.type === "internal_user" ? p.id : null,
          partner_contact_id: p.type === "partner_contact" ? p.id : null,
          role: p.role,
        }));

        await supabase.from("ticket_participants").insert(participantInserts);
      }

      return ticket;
    },
    onSuccess: () => {
      // Invalida todas as queries de tickets (list, all, my)
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(null) });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: UpdateTicketData & { id: string }) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTickets(null) });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: TicketStatus;
    }) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTickets(null) });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tickets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTickets(null) });
    },
  });
}
