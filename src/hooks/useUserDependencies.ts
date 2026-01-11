import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

export interface DependencyItem {
  id: string;
  name: string;
}

export interface UserDependencies {
  /** Mandatory dependencies that BLOCK inactivation until migrated */
  mandatory: {
    kpis: DependencyItem[];
    initiatives: DependencyItem[];
    tickets: DependencyItem[];
  };
  /** Optional dependencies that will be auto-cleared (SET NULL) */
  optional: {
    teams: DependencyItem[];
  };
  hasMandatoryDependencies: boolean;
  totalMandatory: number;
  totalOptional: number;
  isLoading: boolean;
}

/**
 * Hook to fetch all dependencies of a user profile.
 * Used before inactivating/deleting a user to ensure mandatory
 * dependencies are migrated first.
 */
export function useUserDependencies(profileId: string | null): UserDependencies {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  // Fetch KPIs where user is owner
  const { data: kpis = [], isLoading: kpisLoading } = useQuery({
    queryKey: [...queryKeys.kpis.all(buId ?? null), "owner", profileId],
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_metrics")
        .select("id, name")
        .eq("bu_id", buId!)
        .eq("owner_user_id", profileId!)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []).map((k) => ({ id: k.id, name: k.name }));
    },
  });

  // Fetch Initiatives where user is owner
  const { data: initiatives = [], isLoading: initiativesLoading } = useQuery({
    queryKey: [...queryKeys.okrs.initiatives(buId ?? null), "owner", profileId],
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_initiatives")
        .select("id, name")
        .eq("bu_id", buId!)
        .eq("owner_user_id", profileId!)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []).map((i) => ({ id: i.id, name: i.name }));
    },
  });

  // Fetch open Tickets where user is owner (not closed/discarded)
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: [...queryKeys.tickets.all(buId ?? null), "owner", profileId],
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, title")
        .eq("bu_id", buId!)
        .eq("owner_user_id", profileId!)
        .is("deleted_at", null)
        .not("status", "in", '("done","discarded")');

      if (error) throw error;
      return (data || []).map((t) => ({ id: t.id, name: t.title }));
    },
  });

  // Fetch Teams where user is leader (optional - will be SET NULL)
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: [...queryKeys.teams.all(buId ?? null), "leader", profileId],
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("bu_id", buId!)
        .eq("leader_user_id", profileId!)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []).map((t) => ({ id: t.id, name: t.name }));
    },
  });

  const isLoading = kpisLoading || initiativesLoading || ticketsLoading || teamsLoading;
  const totalMandatory = kpis.length + initiatives.length + tickets.length;
  const totalOptional = teams.length;

  return {
    mandatory: {
      kpis,
      initiatives,
      tickets,
    },
    optional: {
      teams,
    },
    hasMandatoryDependencies: totalMandatory > 0,
    totalMandatory,
    totalOptional,
    isLoading,
  };
}
