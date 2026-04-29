/**
 * WeeklyRitualRoute
 *
 * Route guard for the Weekly ritual.
 * Allows access for:
 * - Platform admins / BU admins (isWildcard)
 * - Area leaders (areas.leader_user_id na BU corrente)
 */

import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsAreaLeader } from '@/modules/okrs/hooks/useIsAreaLeader';
import { LoadingState } from '@/components/ui/loading-state';

interface WeeklyRitualRouteProps {
  children: React.ReactNode;
}

export function WeeklyRitualRoute({ children }: WeeklyRitualRouteProps) {
  const { isWildcard, isLoading: permLoading } = usePermissions();
  const { isAreaLeader, isLoading: areaLoading } = useIsAreaLeader();
  const location = useLocation();

  const isLoading = permLoading || (!isWildcard && areaLoading);

  if (isLoading) {
    return <LoadingState fullPage />;
  }

  if (!isWildcard && !isAreaLeader) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
