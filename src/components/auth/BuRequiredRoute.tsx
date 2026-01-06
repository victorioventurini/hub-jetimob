import { Navigate } from "react-router-dom";
import { useBu } from "@/contexts/BuContext";
import { LoadingState } from "@/components/ui/loading-state";

interface BuRequiredRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that ensures a Business Unit has been explicitly selected.
 * Used for operational routes that require BU context.
 * 
 * - If BU is loading: show spinner
 * - If no BU selected: redirect to /select-bu
 * - If BU selected: render children
 */
export function BuRequiredRoute({ children }: BuRequiredRouteProps) {
  const { currentBu, buSelected, isLoading, userBus } = useBu();

  if (isLoading) {
    return <LoadingState fullPage text="Carregando..." />;
  }

  // If user has multiple BUs and hasn't selected one, redirect to selection
  if (userBus.length > 1 && (!buSelected || !currentBu)) {
    return <Navigate to="/select-bu" replace />;
  }

  // If user has no BUs at all, also redirect to selection (will show empty state)
  if (userBus.length === 0) {
    return <Navigate to="/select-bu" replace />;
  }

  // Single BU user or BU already selected - proceed
  return <>{children}</>;
}
