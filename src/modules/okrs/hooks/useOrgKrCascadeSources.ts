/**
 * useOrgKrCascadeSources
 *
 * Verifica se uma KR organizacional tem KRs de time vinculadas (cascade
 * bottom-up via `okr_team_key_results.linked_org_kr_id`). Quando há
 * vínculos ativos, o valor da Org KR é considerado **derivado** e o
 * input manual deve ser bloqueado no `CheckinDialog` — alinhado à Core
 * Rule "Primary KPIs/cascade dictate KR progress automatically".
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

export interface UseOrgKrCascadeSourcesResult {
  hasCascade: boolean;
  linkedCount: number;
  isLoading: boolean;
}

export function useOrgKrCascadeSources(
  orgKrId: string | null | undefined,
): UseOrgKrCascadeSourcesResult {
  const { client: supabase, isReady } = useOptionalBuClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.okrs.orgKrCascadeSources(orgKrId ?? ''),
    queryFn: async (): Promise<number> => {
      if (!supabase || !orgKrId) return 0;
      const { count, error } = await supabase
        .from('okr_team_key_results')
        .select('id', { count: 'exact', head: true })
        .eq('linked_org_kr_id', orgKrId)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgKrId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });

  const linkedCount = data ?? 0;
  return { hasCascade: linkedCount > 0, linkedCount, isLoading };
}
