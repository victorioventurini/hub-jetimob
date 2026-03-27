import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import type { ProjectImpact, MilestoneStatus } from '../types';

export interface MilestoneForKr {
  id: string;
  name: string;
  status: MilestoneStatus;
  due_date: string | null;
  impact: ProjectImpact;
  project_id: string;
  project_name: string;
}

/**
 * Returns milestones directly linked to a specific KR via milestone_krs.
 */
export function useMilestonesForKr(krId: string | undefined) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: projectsKeys.milestoneKrsByKr(krId || ''),
    queryFn: async (): Promise<MilestoneForKr[]> => {
      if (!supabase || !krId || !buId) return [];

      const { data, error } = await supabase
        .from('milestone_krs')
        .select(`
          impact,
          milestone:project_milestones!milestone_krs_milestone_id_fkey(
            id, name, status, due_date, deleted_at,
            project:projects!project_milestones_project_id_fkey(id, name, bu_id)
          )
        `)
        .eq('key_result_id', krId);

      if (error) throw error;

      return (data || [])
        .filter((row: any) => row.milestone && row.milestone.project && row.milestone.project.bu_id === buId && !row.milestone.deleted_at)
        .map((row: any) => ({
          id: row.milestone.id,
          name: row.milestone.name,
          status: row.milestone.status as MilestoneStatus,
          due_date: row.milestone.due_date,
          impact: row.impact as ProjectImpact,
          project_id: row.milestone.project.id,
          project_name: row.milestone.project.name,
        }));
    },
    enabled: isReady && !!supabase && !!krId && !!buId,
  });
}
