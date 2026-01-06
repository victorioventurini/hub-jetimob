import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBu } from '@/contexts/BuContext';
import { OnboardingGuard } from '@/components/onboarding/OnboardingGuard';
import { LoadingState } from '@/components/ui/loading-state';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, skip BU selection check (for global pages and select-bu page) */
  skipBuCheck?: boolean;
}

export function ProtectedRoute({ children, skipBuCheck = false }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { userBus, buSelected, isLoading: buLoading } = useBu();
  const location = useLocation();

  const isLoading = authLoading || buLoading;

  if (isLoading) {
    return <LoadingState fullPage text="Carregando..." />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user needs to select a BU (only for non-global routes)
  // Skip this check for the select-bu page itself and global routes
  if (!skipBuCheck && userBus.length > 1 && !buSelected) {
    return <Navigate to="/select-bu" replace />;
  }

  // Wrap with OnboardingGuard to enforce onboarding completion
  return <OnboardingGuard>{children}</OnboardingGuard>;
}
