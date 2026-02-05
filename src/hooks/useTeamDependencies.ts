import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { DependencyItem } from "./useUserDependencies";

export interface TeamDependencies {
  /** Mandatory dependencies that BLOCK deletion until resolved */
  mandatory: {
    teamObjectives: DependencyItem[];
    teamKrs: DependencyItem[];
    subteams: DependencyItem[];
  };
  /** Optional dependencies that will be auto-cleared */
  optional: {
    members: DependencyItem[];
    squads: DependencyItem[];
  };
  hasMandatoryDependencies: boolean;
  totalMandatory: number;
  totalOptional: number;
  isLoading: boolean;
}

/**
 * Hook to fetch all dependencies of a team.
 * Used before deleting/deactivating a team to ensure mandatory
 * dependencies are resolved first.
 * 
 * Mandatory: Active OKRs (Objectives, KRs), Sub-teams
 * Optional (auto-cleared): Members (team_id set to null), Squads (deleted)
 */
export function useTeamDependencies(teamId: string | null): TeamDependencies {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  // ============================================================
  // MANDATORY DEPENDENCIES - Block deletion until resolved
  // ============================================================

  // Fetch active Team Objectives
  const { data: teamObjectives = [], isLoading: objectivesLoading } = useQuery({
    queryKey: [...queryKeys.okrs.teamObjectivesPrefix(), "team", teamId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_team_objectives")
        .select("id, title")
        .eq("bu_id", buId!)
        .eq("team_id", teamId!)
        .is("deleted_at", null)
        .is("cancelled_at", null)
        .not("status", "in", '("cancelled","discarded")');

      if (error) throw error;
      return (data || []).map((o) => ({ id: o.id, name: o.title }));
    },
  });

  // Fetch active Team KRs
  const { data: teamKrs = [], isLoading: krsLoading } = useQuery({
    queryKey: [...queryKeys.okrs.teamKeyResultsPrefix(), "team", teamId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_team_key_results")
        .select("id, title")
        .eq("bu_id", buId!)
        .eq("team_id", teamId!)
        .is("deleted_at", null)
        .is("cancelled_at", null)
        .not("status", "in", '("cancelled","discarded")');

      if (error) throw error;
      return (data || []).map((kr) => ({ id: kr.id, name: kr.title }));
    },
  });

  // Fetch sub-teams (children)
  const { data: subteams = [], isLoading: subteamsLoading } = useQuery({
    queryKey: [...queryKeys.teams.all(buId ?? null), "children", teamId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("bu_id", buId!)
        .eq("parent_team_id", teamId!)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []).map((t) => ({ id: t.id, name: t.name }));
    },
  });

  // ============================================================
  // OPTIONAL DEPENDENCIES - Will be auto-cleared
  // ============================================================

  // Fetch team members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: [...queryKeys.profiles.all(buId ?? null), "team", teamId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("bu_id", buId!)
        .eq("team_id", teamId!)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []).map((m) => ({ id: m.id, name: m.display_name }));
    },
  });

  // Fetch squads
  const { data: squads = [], isLoading: squadsLoading } = useQuery({
    queryKey: ["squads", "team-deps", teamId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!teamId,
    queryFn: async (): Promise<DependencyItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from("squads")
        .select("id, name")
        .eq("team_id", teamId!);

      if (result.error) throw result.error;
      return (result.data || []).map((s: { id: string; name: string }) => ({ 
        id: s.id, 
        name: s.name 
      }));
    },
  });

  const isLoading = 
    objectivesLoading || 
    krsLoading || 
    subteamsLoading ||
    membersLoading ||
    squadsLoading;

  const totalMandatory = teamObjectives.length + teamKrs.length + subteams.length;
  const totalOptional = members.length + squads.length;

  return {
    mandatory: {
      teamObjectives,
      teamKrs,
      subteams,
    },
    optional: {
      members,
      squads,
    },
    hasMandatoryDependencies: totalMandatory > 0,
    totalMandatory,
    totalOptional,
    isLoading,
  };
}
