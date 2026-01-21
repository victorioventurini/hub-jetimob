/**
 * Hook for fetching user's tickets for home dashboard
 * Returns recent tickets where user is creator or owner, plus summary stats
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
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
}

const OPEN_STATUSES = ["waiting", "in_progress", "paused"] as const satisfies readonly TicketStatus[];

export function useMyTicketsHome(): UseMyTicketsHomeResult {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();
  const { profileId, isReady } = useIdentity();

  const { data, isLoading, error } = useQuery({
    queryKey: homeKeys.myTicketsHome(buId ?? null, profileId ?? null),
    queryFn: async () => {
      if (!buId || !profileId) return { tickets: [], stats: { totalOpen: 0, overdueCount: 0, dueTodayCount: 0 } };

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      // Fetch tickets where user is creator or owner
      const { data: ticketsData, error: ticketsError } = await supabase
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
        .or(`created_by_user_id.eq.${profileId},owner_user_id.eq.${profileId}`)
        .in("status", OPEN_STATUSES)
        .order("updated_at", { ascending: false })
        .limit(5);

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

      // Fetch stats with separate count queries for accuracy
      const [totalOpenResult, overdueResult, dueTodayResult] = await Promise.all([
        // Total open
        supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
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
  };
}
