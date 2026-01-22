/**
 * Hook for fetching ticket viewers (teams/users with visibility) and mentions
 * 
 * Resolves visibility_team_ids and visibility_user_ids to displayable names,
 * and fetches mentions for the ticket.
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { Ticket } from "../types";

interface TeamInfo {
  id: string;
  name: string;
}

interface UserInfo {
  id: string;
  display_name: string;
  photo_url: string | null;
}

interface MentionInfo {
  id: string;
  display_name: string;
  photo_url: string | null;
  type: "user" | "contact";
}

interface TicketViewersData {
  teams: TeamInfo[];
  users: UserInfo[];
  mentions: MentionInfo[];
}

export function useTicketViewersAndMentions(ticket: Ticket | null | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: queryKeys.tickets.viewers(ticket?.id ?? null),
    queryFn: async (): Promise<TicketViewersData> => {
      if (!ticket) {
        return { teams: [], users: [], mentions: [] };
      }

      const results: TicketViewersData = { teams: [], users: [], mentions: [] };

      // Fetch teams if visibility is "teams" and has team IDs
      if (ticket.visibility === "teams" && ticket.visibility_team_ids?.length > 0) {
        const { data: teamsData } = await supabase
          .from("teams")
          .select("id, name")
          .in("id", ticket.visibility_team_ids)
          .is("deleted_at", null);

        results.teams = (teamsData || []) as TeamInfo[];
      }

      // Fetch users if visibility is "users" and has user IDs
      if (ticket.visibility === "users" && ticket.visibility_user_ids?.length > 0) {
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url")
          .in("id", ticket.visibility_user_ids)
          .is("deleted_at", null);

        results.users = (usersData || []) as UserInfo[];
      }

      // Fetch mentions for this ticket (entity_type = "ticket")
      const { data: mentionsData } = await supabase
        .from("mentions")
        .select(`
          mentioned_user_id,
          mentioned_contact_id,
          mentioned_user:profiles!mentions_mentioned_user_id_fkey(id, display_name, photo_url),
          mentioned_contact:partner_contacts!mentions_mentioned_contact_id_fkey(id, name)
        `)
        .eq("entity_type", "ticket")
        .eq("entity_id", ticket.id);

      const seenIds = new Set<string>();
      (mentionsData || []).forEach((mention: any) => {
        const user = Array.isArray(mention.mentioned_user)
          ? mention.mentioned_user[0]
          : mention.mentioned_user;
        const contact = Array.isArray(mention.mentioned_contact)
          ? mention.mentioned_contact[0]
          : mention.mentioned_contact;

        if (user && !seenIds.has(user.id)) {
          seenIds.add(user.id);
          results.mentions.push({
            id: user.id,
            display_name: user.display_name,
            photo_url: user.photo_url,
            type: "user",
          });
        } else if (contact && !seenIds.has(contact.id)) {
          seenIds.add(contact.id);
          results.mentions.push({
            id: contact.id,
            display_name: contact.name,
            photo_url: null,
            type: "contact",
          });
        }
      });

      // Also fetch mentions from ticket messages
      const { data: messageMentions } = await supabase
        .from("mentions")
        .select(`
          mentioned_user_id,
          mentioned_contact_id,
          mentioned_user:profiles!mentions_mentioned_user_id_fkey(id, display_name, photo_url),
          mentioned_contact:partner_contacts!mentions_mentioned_contact_id_fkey(id, name)
        `)
        .eq("entity_type", "ticket_message")
        .in("entity_id", (
          await supabase
            .from("ticket_messages")
            .select("id")
            .eq("ticket_id", ticket.id)
            .is("deleted_at", null)
        ).data?.map((m: any) => m.id) || []);

      (messageMentions || []).forEach((mention: any) => {
        const user = Array.isArray(mention.mentioned_user)
          ? mention.mentioned_user[0]
          : mention.mentioned_user;
        const contact = Array.isArray(mention.mentioned_contact)
          ? mention.mentioned_contact[0]
          : mention.mentioned_contact;

        if (user && !seenIds.has(user.id)) {
          seenIds.add(user.id);
          results.mentions.push({
            id: user.id,
            display_name: user.display_name,
            photo_url: user.photo_url,
            type: "user",
          });
        } else if (contact && !seenIds.has(contact.id)) {
          seenIds.add(contact.id);
          results.mentions.push({
            id: contact.id,
            display_name: contact.name,
            photo_url: null,
            type: "contact",
          });
        }
      });

      return results;
    },
    enabled: !!ticket?.id && !!buId,
    staleTime: 60 * 1000, // 1 minute
  });
}
