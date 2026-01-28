/**
 * Hook to fetch external user dashboard data
 * Tickets and stats for the external user's company
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { queryKeys } from "@/lib/queryKeys";
import type { ExternalUserInfo, ExternalTicketSummary, ExternalDashboardStats, ExternalCompanyContext } from "../types";

export function useExternalDashboard(externalInfo: ExternalUserInfo | null) {
  const supabase = useBuScopedSupabase();
  // Fetch recent tickets
  const {
    data: tickets = [],
    isLoading: isTicketsLoading,
  } = useQuery({
    queryKey: queryKeys.external.tickets(externalInfo?.contactId ?? null),
    queryFn: async () => {
      if (!externalInfo) return [];

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          category:ticket_categories(name),
          subcategory:ticket_subcategories(name)
        `)
        .eq("type", "external")
        .eq("external_company_id", externalInfo.companyId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching external tickets:", error);
        return [];
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        categoryName: t.category?.name || null,
        subcategoryName: t.subcategory?.name || null,
        updatedAt: t.updated_at,
        createdAt: t.created_at,
      })) as ExternalTicketSummary[];
    },
    enabled: !!externalInfo,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: isStatsLoading,
  } = useQuery({
    queryKey: queryKeys.external.stats(externalInfo?.contactId ?? null),
    queryFn: async () => {
      if (!externalInfo) return { totalOpen: 0, awaitingResponse: 0 };

      // Get total open
      const { count: totalOpen } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("type", "external")
        .eq("external_company_id", externalInfo.companyId)
        .not("status", "in", '("done","discarded")')
        .is("deleted_at", null);

      // Get awaiting response (last message from internal user)
      // For simplicity, count tickets in 'waiting' status
      const { count: awaitingResponse } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("type", "external")
        .eq("external_company_id", externalInfo.companyId)
        .eq("status", "waiting")
        .is("deleted_at", null);

      return {
        totalOpen: totalOpen || 0,
        awaitingResponse: awaitingResponse || 0,
      } as ExternalDashboardStats;
    },
    enabled: !!externalInfo,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch company context (categories they can use)
  const {
    data: companyContext,
    isLoading: isContextLoading,
  } = useQuery({
    queryKey: queryKeys.external.companyContext(externalInfo?.companyId ?? null),
    queryFn: async () => {
      if (!externalInfo) return null;

      // Get categories available for external tickets
      const { data: categories, error } = await supabase
        .from("ticket_categories")
        .select(`
          id,
          name,
          subcategories:ticket_subcategories(id, name)
        `)
        .eq("bu_id", externalInfo.buId)
        .in("scope", ["external", "both"])
        .eq("status", "active")
        .is("deleted_at", null)
        .order("display_order");

      if (error) {
        console.error("Error fetching categories:", error);
        return null;
      }

      return {
        companyId: externalInfo.companyId,
        companyName: externalInfo.companyName,
        categories: (categories || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          subcategories: c.subcategories || [],
        })),
      } as ExternalCompanyContext;
    },
    enabled: !!externalInfo,
    staleTime: 10 * 60 * 1000,
  });

  return {
    tickets,
    stats: stats || { totalOpen: 0, awaitingResponse: 0 },
    companyContext,
    isLoading: isTicketsLoading || isStatsLoading || isContextLoading,
  };
}
