/**
 * useIsAreaLeader
 *
 * Verifica se o usuário corrente é leader_user_id de pelo menos uma área
 * ativa na BU corrente. Usado por guards de rituais que liberam acesso a
 * líderes de área (Weekly, C-Level rituals).
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

export function useIsAreaLeader() {
  const { user } = useAuth();
  const { client, isReady, buId } = useOptionalBuClient();

  const { data: isAreaLeader = false, isLoading } = useQuery({
    queryKey: queryKeys.identity
      .permissions(buId ?? null, user?.id ?? null)
      .concat('area-leader-check'),
    queryFn: async () => {
      if (!client || !buId || !user?.id) return false;

      const { data: profile } = await client
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return false;

      const { data } = await client
        .from('areas')
        .select('id')
        .eq('bu_id', buId)
        .eq('leader_user_id', profile.id)
        .is('deleted_at', null)
        .limit(1);

      return (data?.length ?? 0) > 0;
    },
    enabled: isReady && !!user?.id && !!buId,
    staleTime: 5 * 60 * 1000,
  });

  return { isAreaLeader, isLoading };
}
