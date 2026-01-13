import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
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

const DEFAULT_LIMIT = 1000;

// ===========================================
// QUERIES
// ===========================================

/**
 * Hook para buscar tickets (limite alto, busca fluida)
 * @param filters - Filtros de busca
 * @returns Lista de tickets
 */
export function useTickets(filters?: TicketFilters) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.list(buId ?? null, filters as Record<string, unknown>),
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async (): Promise<Ticket[]> => {
      if (!buId) return [];

      // Build base query with explicit fields (no select('*'))
      // Include creator, owner profiles and assigned_contact for external tickets
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
          visibility_team_ids,
          visibility_squad_ids,
          visibility_user_ids,
          partner_company_id,
          category_id,
          subcategory_id,
          external_assignee_contact_ids,
          assigned_contact_id,
          assignment_source,
          created_at,
          updated_at,
          deleted_at,
          partner_company:partner_companies(id, name),
          category:ticket_categories(id, name),
          subcategory:ticket_subcategories(id, name),
          created_by:profiles!tickets_created_by_profile_fkey(id, display_name, photo_url),
          owner:profiles!tickets_owner_profile_fkey(id, display_name, photo_url),
          assigned_contact:partner_contacts!tickets_assigned_contact_id_fkey(id, name, email)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(DEFAULT_LIMIT);

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

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const ticketIds = data.map(t => t.id);

      // Fetch messages counts and last message dates in batch
      const { data: messagesData } = await supabase
        .from("ticket_messages")
        .select("ticket_id, created_at")
        .in("ticket_id", ticketIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      // Aggregate messages count and last_message_at per ticket
      const messagesMap = new Map<string, { count: number; last_at: string | null }>();
      (messagesData || []).forEach(msg => {
        const existing = messagesMap.get(msg.ticket_id);
        if (!existing) {
          messagesMap.set(msg.ticket_id, { count: 1, last_at: msg.created_at });
        } else {
          existing.count++;
        }
      });

      // Fetch mentions with profile info in batch (using global mentions table)
      type MentionRow = {
        entity_id: string;
        mentioned_user_id: string | null;
        mentioned_contact_id: string | null;
        mentioned_user: { id: string; display_name: string; photo_url: string | null } | null;
        mentioned_contact: { id: string; name: string } | null;
      };
      
      const { data: mentionsData } = await supabase
        .from("mentions")
        .select(`
          entity_id,
          mentioned_user_id,
          mentioned_contact_id,
          mentioned_user:profiles!mentions_mentioned_user_id_fkey(id, display_name, photo_url),
          mentioned_contact:partner_contacts!mentions_mentioned_contact_id_fkey(id, name)
        `)
        .eq("entity_type", "ticket")
        .in("entity_id", ticketIds) as { data: MentionRow[] | null };

      // Aggregate mentions per ticket (unique users only)
      type MentionInfo = { id: string; display_name: string; photo_url: string | null; type: 'user' | 'contact' };
      const mentionsMap = new Map<string, MentionInfo[]>();
      (mentionsData || []).forEach((mention: MentionRow) => {
        const ticketId = mention.entity_id;
        const existing = mentionsMap.get(ticketId) || [];
        
        // Get user/contact info
        const user = Array.isArray(mention.mentioned_user) 
          ? mention.mentioned_user[0] 
          : mention.mentioned_user;
        const contact = Array.isArray(mention.mentioned_contact) 
          ? mention.mentioned_contact[0] 
          : mention.mentioned_contact;
        
        if (user && !existing.some(m => m.id === user.id)) {
          existing.push({ 
            id: user.id, 
            display_name: user.display_name, 
            photo_url: user.photo_url,
            type: 'user'
          });
        } else if (contact && !existing.some(m => m.id === contact.id)) {
          existing.push({ 
            id: contact.id, 
            display_name: contact.name, 
            photo_url: null,
            type: 'contact'
          });
        }
        
        mentionsMap.set(ticketId, existing);
      });

      // Map the data to normalize joined relations (Supabase returns arrays for nullable FKs)
      return (data || []).map((ticket) => {
        const msgInfo = messagesMap.get(ticket.id);
        const mentions = mentionsMap.get(ticket.id) || [];
        
        return {
          ...ticket,
          // Normalize single-object relations that might come as arrays
          created_by: Array.isArray(ticket.created_by) ? ticket.created_by[0] ?? null : ticket.created_by,
          owner: Array.isArray(ticket.owner) ? ticket.owner[0] ?? null : ticket.owner,
          partner_company: Array.isArray(ticket.partner_company) ? ticket.partner_company[0] ?? null : ticket.partner_company,
          category: Array.isArray(ticket.category) ? ticket.category[0] ?? null : ticket.category,
          subcategory: Array.isArray(ticket.subcategory) ? ticket.subcategory[0] ?? null : ticket.subcategory,
          assigned_contact: Array.isArray(ticket.assigned_contact) ? ticket.assigned_contact[0] ?? null : ticket.assigned_contact,
          // Aggregated data
          messages_count: msgInfo?.count ?? 0,
          last_message_at: msgInfo?.last_at ?? null,
          mentions_list: mentions,
        };
      }) as Ticket[];
    },
    enabled: !!buId,
  });
}

export function useTicket(ticketId: string | null) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();

  return useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    staleTime: 60 * 1000, // 1 minute - detail pages may have updates
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

        // Se não retornou nada ou can_view é false, o usuário impersonado não pode ver
        if (!rpcResult || rpcResult.length === 0 || !rpcResult[0]?.can_view) {
          return null;
        }

        // Agora busca o ticket completo com joins (já que passou na verificação)
        // O admin pode ver, então a query normal funciona
      }

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id, bu_id, type, title, status,
          expected_due_at, visibility,
          created_by_user_id, owner_user_id, assigned_contact_id,
          partner_company_id, category_id, subcategory_id,
          created_at, updated_at,
          partner_company:partner_companies(id, name),
          category:ticket_categories(id, name),
          subcategory:ticket_subcategories(id, name),
          created_by:profiles!tickets_created_by_profile_fkey(id, display_name, photo_url),
          owner:profiles!tickets_owner_profile_fkey(id, display_name, photo_url),
          assigned_contact:partner_contacts!tickets_assigned_contact_id_fkey(id, name, email)
        `)
        .eq("id", ticketId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      
      // Normalize single-object relations that might come as arrays
      if (data) {
        return {
          ...data,
          created_by: Array.isArray(data.created_by) ? data.created_by[0] ?? null : data.created_by,
          owner: Array.isArray(data.owner) ? data.owner[0] ?? null : data.owner,
          partner_company: Array.isArray(data.partner_company) ? data.partner_company[0] ?? null : data.partner_company,
          category: Array.isArray(data.category) ? data.category[0] ?? null : data.category,
          subcategory: Array.isArray(data.subcategory) ? data.subcategory[0] ?? null : data.subcategory,
          assigned_contact: Array.isArray(data.assigned_contact) ? data.assigned_contact[0] ?? null : data.assigned_contact,
        } as Ticket;
      }
      return null;
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async (): Promise<Ticket[]> => {
      if (!buId || !profileId) return [];

      const { data, error } = await supabase
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
          assigned_contact_id,
          created_at,
          updated_at,
          partner_company:partner_companies(id, name),
          category:ticket_categories(id, name),
          subcategory:ticket_subcategories(id, name),
          created_by:profiles!tickets_created_by_profile_fkey(id, display_name, photo_url),
          owner:profiles!tickets_owner_profile_fkey(id, display_name, photo_url),
          assigned_contact:partner_contacts!tickets_assigned_contact_id_fkey(id, name, email)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .or(`created_by_user_id.eq.${profileId},owner_user_id.eq.${profileId}`)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const ticketIds = data.map(t => t.id);

      // Fetch messages counts and last message dates in batch
      const { data: messagesData } = await supabase
        .from("ticket_messages")
        .select("ticket_id, created_at")
        .in("ticket_id", ticketIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      // Aggregate messages count and last_message_at per ticket
      const messagesMap = new Map<string, { count: number; last_at: string | null }>();
      (messagesData || []).forEach(msg => {
        const existing = messagesMap.get(msg.ticket_id);
        if (!existing) {
          messagesMap.set(msg.ticket_id, { count: 1, last_at: msg.created_at });
        } else {
          existing.count++;
        }
      });

      // Fetch mentions with profile info in batch (using global mentions table)
      type MentionRow = {
        entity_id: string;
        mentioned_user_id: string | null;
        mentioned_contact_id: string | null;
        mentioned_user: { id: string; display_name: string; photo_url: string | null } | null;
        mentioned_contact: { id: string; name: string } | null;
      };
      
      const { data: mentionsData } = await supabase
        .from("mentions")
        .select(`
          entity_id,
          mentioned_user_id,
          mentioned_contact_id,
          mentioned_user:profiles!mentions_mentioned_user_id_fkey(id, display_name, photo_url),
          mentioned_contact:partner_contacts!mentions_mentioned_contact_id_fkey(id, name)
        `)
        .eq("entity_type", "ticket")
        .in("entity_id", ticketIds) as { data: MentionRow[] | null };

      // Aggregate mentions per ticket (unique users only)
      type MentionInfo = { id: string; display_name: string; photo_url: string | null; type: 'user' | 'contact' };
      const mentionsMap = new Map<string, MentionInfo[]>();
      (mentionsData || []).forEach((mention: MentionRow) => {
        const ticketId = mention.entity_id;
        const existing = mentionsMap.get(ticketId) || [];
        
        const user = Array.isArray(mention.mentioned_user) 
          ? mention.mentioned_user[0] 
          : mention.mentioned_user;
        const contact = Array.isArray(mention.mentioned_contact) 
          ? mention.mentioned_contact[0] 
          : mention.mentioned_contact;
        
        if (user && !existing.some(m => m.id === user.id)) {
          existing.push({ 
            id: user.id, 
            display_name: user.display_name, 
            photo_url: user.photo_url,
            type: 'user'
          });
        } else if (contact && !existing.some(m => m.id === contact.id)) {
          existing.push({ 
            id: contact.id, 
            display_name: contact.name,
            photo_url: null,
            type: 'contact'
          });
        }
        
        mentionsMap.set(ticketId, existing);
      });

      // Map the data to normalize joined relations
      return data.map((ticket) => {
        const msgInfo = messagesMap.get(ticket.id);
        const mentions = mentionsMap.get(ticket.id) || [];
        
        return {
          ...ticket,
          created_by: Array.isArray(ticket.created_by) ? ticket.created_by[0] ?? null : ticket.created_by,
          owner: Array.isArray(ticket.owner) ? ticket.owner[0] ?? null : ticket.owner,
          partner_company: Array.isArray(ticket.partner_company) ? ticket.partner_company[0] ?? null : ticket.partner_company,
          category: Array.isArray(ticket.category) ? ticket.category[0] ?? null : ticket.category,
          subcategory: Array.isArray(ticket.subcategory) ? ticket.subcategory[0] ?? null : ticket.subcategory,
          assigned_contact: Array.isArray(ticket.assigned_contact) ? ticket.assigned_contact[0] ?? null : ticket.assigned_contact,
          messages_count: msgInfo?.count ?? 0,
          last_message_at: msgInfo?.last_at ?? null,
          mentions_list: mentions,
        };
      }) as Ticket[];
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

        // Insert mentions for initial message (using global mentions table)
        if (!messageError && message && data.initial_message_mentions && data.initial_message_mentions.length > 0) {
          const mentionInserts = data.initial_message_mentions
            .filter((m) => m.user_id || m.contact_id)
            .map((m) => ({
              bu_id: buId,
              entity_type: "ticket_message" as const,
              entity_id: message.id,
              mentioned_user_id: m.user_id || null,
              mentioned_contact_id: m.contact_id || null,
              created_by: profileId,
            }));

          if (mentionInserts.length > 0) {
            await supabase.from("mentions").insert(mentionInserts);
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
      // Invalidate ticket lists (all filters) + my tickets for this BU
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.listPrefix(buId ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTicketsPrefix(buId ?? null) });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.listPrefix(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTicketsPrefix(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(variables.id) });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.listPrefix(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTicketsPrefix(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(variables.id) });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.listPrefix(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.myTicketsPrefix(buId) });
    },
  });
}
