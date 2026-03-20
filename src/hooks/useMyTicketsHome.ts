/**
 * Hook for fetching user's tickets for home dashboard
 * Returns recent tickets where user is creator or owner, plus summary stats
 * Supports impersonation (including external users)
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import { homeKeys } from "@/lib/queryKeys/misc";
import { isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export interface HomeTicketSummary {
  id: string;
  title: string;
  status: string;
  type: string;
  expectedDueAt: string | null;
  updatedAt: string;
  createdAt: string;
  categoryName: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
}

export interface MyTicketsHomeStats {
  totalOpen: number;
  overdueCount: number;
  dueTodayCount: number;
}

export interface UseMyTicketsHomeResult {
  tickets: HomeTicketSummary[];
  stats: MyTicketsHomeStats;
  isLoading: boolean;
  error: Error | null;
  isViewingAsExternal: boolean;
}

const OPEN_STATUSES = ["waiting", "in_progress", "paused"] as const satisfies readonly TicketStatus[];

export function useMyTicketsHome(): UseMyTicketsHomeResult {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();
  const { profileId, isReady } = useIdentity();
  const { isImpersonating, impersonatedUser, impersonatedUserId } = useOptionalImpersonation();
  
  // Check if impersonating an external user
  const isViewingAsExternal = isImpersonating && impersonatedUser?.employmentStatus === "external";

  const { data, isLoading, error } = useQuery({
    queryKey: homeKeys.myTicketsHome(buId ?? null, profileId ?? null, isImpersonating ? impersonatedUserId : null),
    queryFn: async () => {
      if (!buId || !profileId) return { tickets: [], stats: { totalOpen: 0, overdueCount: 0, dueTodayCount: 0 } };

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      // During impersonation, use the RPC to get visible ticket IDs
      let visibleTicketIds: string[] | null = null;
      if (isImpersonating && impersonatedUserId) {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc("get_visible_ticket_ids_for_impersonation", {
            p_profile_id: impersonatedUserId,
          });
        
        if (rpcError) throw rpcError;
        visibleTicketIds = rpcResult || [];
        
        if (visibleTicketIds.length === 0) {
          return { tickets: [], stats: { totalOpen: 0, overdueCount: 0, dueTodayCount: 0 } };
        }
      }

      // Build base query
      let ticketsQuery = supabase
        .from("tickets")
        .select(`
          id,
          title,
          status,
          type,
          expected_due_at,
          updated_at,
          created_at,
          category:ticket_categories(name)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .in("status", OPEN_STATUSES)
        .order("updated_at", { ascending: false })
        .limit(5);
      
      // Filter by visible IDs during impersonation, otherwise by creator/owner
      if (visibleTicketIds !== null) {
        ticketsQuery = ticketsQuery.in("id", visibleTicketIds);
      } else {
        ticketsQuery = ticketsQuery.or(`created_by_user_id.eq.${profileId},owner_user_id.eq.${profileId}`);
      }

      const { data: ticketsData, error: ticketsError } = await ticketsQuery;

      if (ticketsError) throw ticketsError;

      // Process tickets with overdue/dueToday flags
      const tickets: HomeTicketSummary[] = (ticketsData || []).map((t: any) => {
        const expectedDueAt = t.expected_due_at ? new Date(t.expected_due_at) : null;
        const isOverdue = expectedDueAt ? isBefore(expectedDueAt, now) : false;
        const isDueToday = expectedDueAt 
          ? isAfter(expectedDueAt, todayStart) && isBefore(expectedDueAt, todayEnd)
          : false;

        return {
          id: t.id,
          title: t.title,
          status: t.status,
          type: t.type,
          expectedDueAt: t.expected_due_at,
          updatedAt: t.updated_at,
          createdAt: t.created_at,
          categoryName: t.category?.name || null,
          isOverdue,
          isDueToday,
        };
      });

      // Fetch stats - during impersonation, filter by visible IDs
      let statsFilter: string | null = null;
      if (visibleTicketIds !== null && visibleTicketIds.length > 0) {
        // For stats during impersonation, we need to count from visible tickets
        const openCount = tickets.length;
        const overdueCount = tickets.filter(t => t.isOverdue).length;
        const dueTodayCount = tickets.filter(t => t.isDueToday).length;
        
        return { 
          tickets, 
          stats: { totalOpen: openCount, overdueCount, dueTodayCount } 
        };
      }
      
      // Normal stats query (not impersonating)
      const [totalOpenResult, overdueResult, dueTodayResult] = await Promise.all([
        // Total open
        supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("bu_id", buId)
          .is("deleted_at", null)
          .or(`created_by_user_id.eq.${profileId},owner_user_id.eq.${profileId}`)
          .in("status", OPEN_STATUSES),
        // Overdue
        supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("bu_id", buId)
          .is("deleted_at", null)
          .or(`created_by_user_id.eq.${profileId},owner_user_id.eq.${profileId}`)
          .in("status", OPEN_STATUSES)
          .lt("expected_due_at", now.toISOString()),
        // Due today
        supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("bu_id", buId)
          .is("deleted_at", null)
          .or(`created_by_user_id.eq.${profileId},owner_user_id.eq.${profileId}`)
          .in("status", OPEN_STATUSES)
          .gte("expected_due_at", todayStart.toISOString())
          .lte("expected_due_at", todayEnd.toISOString()),
      ]);

      const stats: MyTicketsHomeStats = {
        totalOpen: totalOpenResult.count || 0,
        overdueCount: overdueResult.count || 0,
        dueTodayCount: dueTodayResult.count || 0,
      };

      return { tickets, stats };
    },
    enabled: !!buId && isReady,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    tickets: data?.tickets || [],
    stats: data?.stats || { totalOpen: 0, overdueCount: 0, dueTodayCount: 0 },
    isLoading,
    error: error as Error | null,
    isViewingAsExternal,
  };
}
