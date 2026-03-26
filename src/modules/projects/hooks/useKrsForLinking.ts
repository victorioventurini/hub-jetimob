import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { projectsKeys } from '@/lib/queryKeys/projects';

export interface KrForLinking {
  id: string;
  title: string;
  objective_title: string | null;
  status: string;
}

export function useKrsForLinking() {
  const { client: supabase } = useOptionalBuClient();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: projectsKeys.krsForLinking(currentBuId),
    enabled: !!supabase && !!currentBuId,
    queryFn: async (): Promise<KrForLinking[]> => {
      if (!supabase || !currentBuId) return [];

      const { data, error } = await supabase
        .from('okr_team_key_results')
        .select('id, title, status, objective:okr_team_objectives(title)')
        .eq('bu_id', currentBuId)
        .is('deleted_at', null)
        .order('title');

      if (error) throw error;

      return (data ?? []).map((kr: any) => ({
        id: kr.id,
        title: kr.title,
        objective_title: kr.objective?.title ?? null,
        status: kr.status,
      }));
    },
  });
}
