/**
 * CLevelRitualRoute
 * 
 * Route guard for C-Level rituals (QBR C-Level, QBR Meeting, QBR Post).
 * Allows access for:
 * - Platform admins (super_admin / admin)
 * - BU admins (isWildcard)
 * - Area leaders (areas.leader_user_id)
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { LoadingState } from '@/components/ui/loading-state';
import { queryKeys } from '@/lib/queryKeys';

interface CLevelRitualRouteProps {
  children: React.ReactNode;
}

export function CLevelRitualRoute({ children }: CLevelRitualRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { isWildcard, isLoading: permLoading } = usePermissions();
  const { client, isReady } = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const location = useLocation();

  const { data: isAreaLeader = false, isLoading: areaLoading } = useQuery({
    queryKey: queryKeys.identity.permissions(currentBuId ?? null, user?.id ?? null).concat('area-leader-check'),
    queryFn: async () => {
      if (!client || !currentBuId || !user?.id) return false;

      // Get profile_id for this auth user
      const { data: profile } = await client
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return false;

      const { data } = await client
        .from('areas')
        .select('id')
        .eq('bu_id', currentBuId)
        .eq('leader_user_id', profile.id)
        .is('deleted_at', null)
        .limit(1);

      return (data?.length ?? 0) > 0;
    },
    enabled: isReady && !!user?.id && !!currentBuId && !isWildcard,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = authLoading || permLoading || (!isWildcard && areaLoading);

  if (isLoading) {
    return <LoadingState fullPage />;
  }

  if (!isWildcard && !isAreaLeader) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
