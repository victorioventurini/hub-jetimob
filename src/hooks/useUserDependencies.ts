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
    teamObjectives: DependencyItem[];
    teamKrs: DependencyItem[];
    orgObjectives: DependencyItem[];
    orgKrs: DependencyItem[];
  };
  /** Optional dependencies that will be auto-cleared (SET NULL) */
  optional: {
    teams: DependencyItem[];
    areaLeaderships: DependencyItem[];
    areaCoLeaderships: DependencyItem[];
    krCoResponsible: DependencyItem[];
    kpiContributions: DependencyItem[];
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
 * 
 * Mandatory: KPIs, Initiatives, Tickets, Team Objectives, Team KRs, Org Objectives, Org KRs
 * Optional (auto-cleared): Teams leadership, Area leadership/co-leadership, KR co-responsibles, KPI contributions
 */
export function useUserDependencies(profileId: string | null): UserDependencies {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  // ============================================================
  // MANDATORY DEPENDENCIES - Block inactivation until migrated
  // ============================================================

  // Fetch KPIs where user is owner
  const { data: kpis = [], isLoading: kpisLoading } = useQuery({
    queryKey: [...queryKeys.kpis.all(buId ?? null), "owner", profileId],
    staleTime: 2 * 60 * 1000,
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
    queryKey: [...queryKeys.okrs.initiativesAll(), "owner", profileId],
    staleTime: 2 * 60 * 1000,
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
    staleTime: 2 * 60 * 1000,
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

  // Fetch Team Objectives where user is owner
  const { data: teamObjectives = [], isLoading: teamObjectivesLoading } = useQuery({
    queryKey: [...queryKeys.okrs.teamObjectivesPrefix(), "owner", profileId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_team_objectives")
        .select("id, title")
        .eq("bu_id", buId!)
        .eq("owner_user_id", profileId!)
        .is("deleted_at", null)
        .is("cancelled_at", null)
        .not("status", "in", '("cancelled","discarded")');

      if (error) throw error;
      return (data || []).map((o) => ({ id: o.id, name: o.title }));
    },
  });

  // Fetch Team KRs where user is owner
  const { data: teamKrs = [], isLoading: teamKrsLoading } = useQuery({
    queryKey: [...queryKeys.okrs.teamKeyResultsPrefix(), "owner", profileId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_team_key_results")
        .select("id, title")
        .eq("bu_id", buId!)
        .eq("owner_user_id", profileId!)
        .is("deleted_at", null)
        .is("cancelled_at", null)
        .not("status", "in", '("cancelled","discarded")');

      if (error) throw error;
      return (data || []).map((kr) => ({ id: kr.id, name: kr.title }));
    },
  });

  // Fetch Org Objectives where user is owner
  const { data: orgObjectives = [], isLoading: orgObjectivesLoading } = useQuery({
    queryKey: [...queryKeys.okrs.orgObjectivesPrefix(), "owner", profileId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_org_objectives")
        .select("id, title")
        .eq("bu_id", buId!)
        .eq("owner_user_id", profileId!)
        .is("deleted_at", null)
        .is("cancelled_at", null)
        .not("status", "in", '("cancelled","discarded")');

      if (error) throw error;
      return (data || []).map((o) => ({ id: o.id, name: o.title }));
    },
  });

  // Fetch Org KRs where user is owner
  const { data: orgKrs = [], isLoading: orgKrsLoading } = useQuery({
    queryKey: [...queryKeys.okrs.orgKeyResultsPrefix(), "owner", profileId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_org_key_results")
        .select("id, title")
        .eq("bu_id", buId!)
        .eq("owner_user_id", profileId!)
        .is("deleted_at", null)
        .is("cancelled_at", null)
        .not("status", "in", '("cancelled","discarded")');

      if (error) throw error;
      return (data || []).map((kr) => ({ id: kr.id, name: kr.title }));
    },
  });

  // ============================================================
  // OPTIONAL DEPENDENCIES - Will be SET NULL automatically
  // ============================================================

  // Fetch Teams where user is leader (optional - will be SET NULL)
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: [...queryKeys.teams.all(buId ?? null), "leader", profileId],
    staleTime: 2 * 60 * 1000,
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

  // Fetch Areas where user is leader
  const { data: areaLeaderships = [], isLoading: areaLeadershipsLoading } = useQuery({
    queryKey: [...queryKeys.areas.all(buId ?? null), "leader", profileId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name")
        .eq("bu_id", buId!)
        .eq("leader_user_id", profileId!)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []).map((a) => ({ id: a.id, name: a.name }));
    },
  });

  // Fetch Areas where user is co-leader
  const { data: areaCoLeaderships = [], isLoading: areaCoLeadershipsLoading } = useQuery({
    queryKey: [...queryKeys.areas.all(buId ?? null), "coLeader", profileId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name")
        .eq("bu_id", buId!)
        .eq("co_leader_user_id", profileId!)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []).map((a) => ({ id: a.id, name: a.name }));
    },
  });

  // Fetch Team KRs where user is co-responsible
  const { data: krCoResponsible = [], isLoading: krCoResponsibleLoading } = useQuery({
    queryKey: [...queryKeys.okrs.teamKeyResultsPrefix(), "coResponsible", profileId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_team_key_results")
        .select("id, title")
        .eq("bu_id", buId!)
        .contains("co_responsibles", [profileId!])
        .is("deleted_at", null)
        .is("cancelled_at", null)
        .not("status", "in", '("cancelled","discarded")');

      if (error) throw error;
      return (data || []).map((kr) => ({ id: kr.id, name: kr.title }));
    },
  });

  // Fetch KPI contributions where user is contributor
  const { data: kpiContributions = [], isLoading: kpiContributionsLoading } = useQuery({
    queryKey: [...queryKeys.kpis.all(buId ?? null), "contributor", profileId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_data_contributors")
        .select("id, kpi:kpi_metrics(id, name)")
        .eq("bu_id", buId!)
        .eq("contributor_user_id", profileId!)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || [])
        .filter((c) => c.kpi)
        .map((c) => ({ 
          id: c.id, 
          name: (c.kpi as { id: string; name: string })?.name || "KPI sem nome"
        }));
    },
  });

  const isLoading = 
    kpisLoading || 
    initiativesLoading || 
    ticketsLoading || 
    teamObjectivesLoading ||
    teamKrsLoading ||
    orgObjectivesLoading ||
    orgKrsLoading ||
    teamsLoading ||
    areaLeadershipsLoading ||
    areaCoLeadershipsLoading ||
    krCoResponsibleLoading ||
    kpiContributionsLoading;

  const totalMandatory = 
    kpis.length + 
    initiatives.length + 
    tickets.length + 
    teamObjectives.length +
    teamKrs.length +
    orgObjectives.length +
    orgKrs.length;

  const totalOptional = 
    teams.length + 
    areaLeaderships.length + 
    areaCoLeaderships.length +
    krCoResponsible.length +
    kpiContributions.length;

  return {
    mandatory: {
      kpis,
      initiatives,
      tickets,
      teamObjectives,
      teamKrs,
      orgObjectives,
      orgKrs,
    },
    optional: {
      teams,
      areaLeaderships,
      areaCoLeaderships,
      krCoResponsible,
      kpiContributions,
    },
    hasMandatoryDependencies: totalMandatory > 0,
    totalMandatory,
    totalOptional,
    isLoading,
  };
}
