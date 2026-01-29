/**
 * Ticket Query Utilities
 * 
 * Shared types and utility functions for ticket queries.
 */

import type { Ticket } from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ===========================================
// TYPES
// ===========================================

export type MentionRow = {
  entity_id: string;
  mentioned_user_id: string | null;
  mentioned_contact_id: string | null;
  mentioned_user: { id: string; display_name: string; photo_url: string | null } | null;
  mentioned_contact: { id: string; name: string } | null;
};

export type MentionInfo = { 
  id: string; 
  display_name: string; 
  photo_url: string | null; 
  type: 'user' | 'contact';
};

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Fetch messages count and last message date for tickets in batch
 */
export async function fetchMessagesCounts(
  supabase: SupabaseClient<Database>,
  ticketIds: string[]
): Promise<Map<string, { count: number; last_at: string | null }>> {
  const messagesMap = new Map<string, { count: number; last_at: string | null }>();
  
  if (ticketIds.length === 0) return messagesMap;

  const { data: messagesData } = await supabase
    .from("ticket_messages")
    .select("ticket_id, created_at")
    .in("ticket_id", ticketIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  (messagesData || []).forEach(msg => {
    const existing = messagesMap.get(msg.ticket_id);
    if (!existing) {
      messagesMap.set(msg.ticket_id, { count: 1, last_at: msg.created_at });
    } else {
      existing.count++;
    }
  });

  return messagesMap;
}

/**
 * Fetch mentions with profile info for tickets in batch
 */
export async function fetchMentions(
  supabase: SupabaseClient<Database>,
  ticketIds: string[]
): Promise<Map<string, MentionInfo[]>> {
  const mentionsMap = new Map<string, MentionInfo[]>();
  
  if (ticketIds.length === 0) return mentionsMap;

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

  return mentionsMap;
}

/**
 * Normalize single-object relations that might come as arrays from Supabase
 */
export function normalizeTicketRelations(ticket: any, messagesMap?: Map<string, { count: number; last_at: string | null }>, mentionsMap?: Map<string, MentionInfo[]>): Ticket {
  const msgInfo = messagesMap?.get(ticket.id);
  const mentions = mentionsMap?.get(ticket.id) || [];
  
  // Handle external_company alias → partner_company for backward compatibility
  // Query uses external_company:external_companies(...) but type expects partner_company
  const externalCompany = Array.isArray(ticket.external_company) 
    ? ticket.external_company[0] ?? null 
    : ticket.external_company ?? null;
  
  return {
    ...ticket,
    created_by: Array.isArray(ticket.created_by) ? ticket.created_by[0] ?? null : ticket.created_by,
    owner: Array.isArray(ticket.owner) ? ticket.owner[0] ?? null : ticket.owner,
    // Map external_company → partner_company (unified model TCR v2.73+)
    partner_company: externalCompany,
    category: Array.isArray(ticket.category) ? ticket.category[0] ?? null : ticket.category,
    subcategory: Array.isArray(ticket.subcategory) ? ticket.subcategory[0] ?? null : ticket.subcategory,
    assigned_contact: Array.isArray(ticket.assigned_contact) ? ticket.assigned_contact[0] ?? null : ticket.assigned_contact,
    messages_count: msgInfo?.count ?? 0,
    last_message_at: msgInfo?.last_at ?? null,
    mentions_list: mentions,
  } as Ticket;
}
