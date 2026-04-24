import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import type { ProjectImpact, KrLinkKind } from '../types';

export interface MilestoneKrLink {
  key_result_id: string;
  kr_title: string;
  impact: ProjectImpact;
  kind: KrLinkKind;
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
        .select(
          `key_result_id, org_key_result_id, impact,
           kr:okr_team_key_results!milestone_krs_key_result_id_fkey(title),
           org_kr:okr_org_key_results!milestone_krs_org_key_result_id_fkey(title)`,
        )
        .eq('milestone_id', milestoneId);

      if (error) throw error;

      return (data ?? []).map((row: any) => {
        const isOrg = !!row.org_key_result_id;
        return {
          key_result_id: isOrg ? row.org_key_result_id : row.key_result_id,
          kr_title: isOrg ? (row.org_kr?.title ?? '') : (row.kr?.title ?? ''),
          impact: row.impact as ProjectImpact,
          kind: isOrg ? ('org' as const) : ('team' as const),
        };
      });
    },
  });
}
