import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { LoadingState } from '@/components/ui/loading-state';

interface BuAdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that allows access for platform admins OR BU admins.
 * 
 * Uses isWildcard from usePermissions which is true for:
 * - super_admin (global)
 * - admin (global)  
 * - admin role in current BU (via bu_user_memberships)
 * 
 * Use AdminRoute when you need platform-level admins only.
 * Use BuAdminRoute when BU-level admins should also have access.
 */
export function BuAdminRoute({ children }: BuAdminRouteProps) {
  const { isLoading: authLoading } = useAuth();
  const { isWildcard, isLoading: permissionsLoading } = usePermissions();
  const location = useLocation();

  const isLoading = authLoading || permissionsLoading;

  if (isLoading) {
    return <LoadingState fullPage />;
  }

  // isWildcard is true for platform admins AND BU admins
  if (!isWildcard) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
