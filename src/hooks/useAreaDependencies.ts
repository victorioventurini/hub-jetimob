import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { DependencyItem } from "./useUserDependencies";

export interface AreaDependencies {
  /** Mandatory dependencies that BLOCK deletion until resolved */
  mandatory: {
    teams: DependencyItem[];
  };
  /** Optional dependencies - Areas don't have OKRs directly */
  optional: Record<string, never>;
  hasMandatoryDependencies: boolean;
  totalMandatory: number;
  totalOptional: number;
  isLoading: boolean;
}

/**
 * Hook to fetch all dependencies of an area.
 * Used before deleting/deactivating an area to ensure mandatory
 * dependencies are resolved first.
 * 
 * Mandatory: Teams linked to this area
 * Optional: None (areas don't have OKRs directly - they're strategic groupings)
 */
export function useAreaDependencies(areaId: string | null): AreaDependencies {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  // ============================================================
  // MANDATORY DEPENDENCIES - Block deletion until resolved
  // ============================================================

  // Fetch teams linked to this area
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: [...queryKeys.teams.all(buId ?? null), "area", areaId],
    staleTime: 2 * 60 * 1000,
    enabled: !!buId && !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("bu_id", buId!)
        .eq("area_id", areaId!)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []).map((t) => ({ id: t.id, name: t.name }));
    },
  });

  const isLoading = teamsLoading;
  const totalMandatory = teams.length;
  const totalOptional = 0;

  return {
    mandatory: {
      teams,
    },
    optional: {},
    hasMandatoryDependencies: totalMandatory > 0,
    totalMandatory,
    totalOptional,
    isLoading,
  };
}
