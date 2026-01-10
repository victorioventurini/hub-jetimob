import { Navigate, useLocation, type Location } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBu } from '@/contexts/BuContext';
import { OnboardingGuard } from '@/components/onboarding/OnboardingGuard';
import { LoadingState } from '@/components/ui/loading-state';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, skip BU selection check (for global pages and select-bu page) */
  skipBuCheck?: boolean;
  /** If true, skip onboarding check (for onboarding page itself) */
  skipOnboardingCheck?: boolean;
}

export function ProtectedRoute({ children, skipBuCheck = false, skipOnboardingCheck = false }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { userBus, buSelected, isLoading: buLoading } = useBu();
  const location = useLocation();

  // Preserve the original intended destination across multiple redirects.
  const fromLocation = (location.state as { from?: Location } | null)?.from ?? location;

  const isLoading = authLoading || buLoading;

  if (isLoading) {
    return <LoadingState fullPage text="Carregando..." />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: fromLocation }} replace />;
  }

  // Check if user needs to select a BU (only for non-global routes)
  // Skip this check for the select-bu page itself and global routes
  if (!skipBuCheck && userBus.length > 1 && !buSelected) {
    return <Navigate to="/select-bu" state={{ from: fromLocation }} replace />;
  }

  // Skip onboarding guard for onboarding page itself
  if (skipOnboardingCheck) {
    return <>{children}</>;
  }

  // Wrap with OnboardingGuard to enforce onboarding completion
  return <OnboardingGuard>{children}</OnboardingGuard>;
}
