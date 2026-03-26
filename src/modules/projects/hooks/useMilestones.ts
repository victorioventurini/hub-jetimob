import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { projectsKeys } from '@/lib/queryKeys/projects';
import type { ProjectMilestone } from '../types';

const MILESTONE_FIELDS = `
  id, project_id, name, owner_id, status, due_date,
  sort_order, bu_id, created_at, updated_at, deleted_at
` as const;

export function useMilestones(projectId: string | undefined) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: projectsKeys.milestones(projectId || ''),
    queryFn: async () => {
      if (!supabase || !projectId) return [];

      const { data, error } = await supabase
        .from('project_milestones')
        .select(MILESTONE_FIELDS)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as ProjectMilestone[];
    },
    enabled: isReady && !!supabase && !!projectId,
  });
}
