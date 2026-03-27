import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { projectsKeys } from '@/lib/queryKeys/projects';

export interface ProjectForLinking {
  id: string;
  name: string;
  status: string;
}

export function useProjectsForLinking() {
  const { client: supabase } = useOptionalBuClient();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: projectsKeys.projectsForLinking(currentBuId),
    enabled: !!supabase && !!currentBuId,
    queryFn: async (): Promise<ProjectForLinking[]> => {
      if (!supabase || !currentBuId) return [];

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('bu_id', currentBuId)
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .order('name');

      if (error) throw error;

      return (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
      }));
    },
  });
}
