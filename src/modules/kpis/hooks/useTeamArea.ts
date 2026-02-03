/**
 * Hook to fetch the area associated with a team
 * Used for auto-inference when scope='team'
 * v2.82.0 - Indicator Module Evolution
 */
import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { queryKeys } from "@/lib/queryKeys";

interface TeamAreaResult {
  areaId: string | null;
  areaName: string | null;
  areaColor: string | null;
  isLoading: boolean;
}

/**
 * Fetches the area associated with a team for auto-inference
 * When scope='team', the area is automatically inferred from the team
 * 
 * @param teamId - The team ID to fetch area for
 * @returns { areaId, areaName, areaColor, isLoading }
 */
export function useTeamArea(teamId: string | undefined): TeamAreaResult {
  const supabase = useOptionalBuScopedSupabase();

  const { data, isLoading } = useQuery({
    queryKey: ['teams', 'area', teamId],
    queryFn: async () => {
      if (!supabase || !teamId) return null;

      const { data: team, error } = await supabase
        .from("teams")
        .select(`
          area_id,
          area:areas!teams_area_id_fkey(
            id,
            name,
            color
          )
        `)
        .eq("id", teamId)
        .maybeSingle();

      if (error) throw error;
      if (!team) return null;

      return {
        areaId: team.area_id,
        areaName: (team.area as any)?.name ?? null,
        areaColor: (team.area as any)?.color ?? null,
      };
    },
    enabled: !!supabase && !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes - areas don't change often
  });

  return {
    areaId: data?.areaId ?? null,
    areaName: data?.areaName ?? null,
    areaColor: data?.areaColor ?? null,
    isLoading,
  };
}
