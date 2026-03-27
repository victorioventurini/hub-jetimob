import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import type { ProjectImpact } from '../types';

export interface MilestoneKrLink {
  key_result_id: string;
  kr_title: string;
  impact: ProjectImpact;
}

export function useMilestoneKrs(milestoneId: string | null) {
  const { client: supabase } = useOptionalBuClient();

  return useQuery({
    queryKey: projectsKeys.milestoneKrs(milestoneId ?? ''),
    enabled: !!supabase && !!milestoneId,
    queryFn: async (): Promise<MilestoneKrLink[]> => {
      if (!supabase || !milestoneId) return [];

      const { data, error } = await supabase
        .from('milestone_krs')
        .select('key_result_id, impact, kr:okr_team_key_results(title)')
        .eq('milestone_id', milestoneId);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        key_result_id: row.key_result_id,
        kr_title: row.kr?.title ?? '',
        impact: row.impact as ProjectImpact,
      }));
    },
  });
}
