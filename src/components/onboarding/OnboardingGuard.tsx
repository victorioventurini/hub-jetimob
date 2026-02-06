import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/globalClient";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { LoadingState } from "@/components/ui/loading-state";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * OnboardingGuard
 * 
 * Guards routes that require onboarding completion.
 * 
 * Both internal and external users have profiles created by the handle_new_user trigger.
 * All users must complete onboarding before accessing protected routes.
 * 
 * @see docs/guides/EXTERNAL_USER_IDENTITY_PATTERN.md
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading: authLoading } = useAuth();

  // NOTE: Onboarding happens before BU selection; must NOT require BU-scoped client.
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.onboarding.check(user?.id ?? null),
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos para evitar refetch desnecessário
  });

  const onboardingCompleted = profile?.onboarding_completed ?? false;

  // Still loading auth or profile
  if (authLoading || profileLoading) {
    return <LoadingState fullPage text="Carregando..." />;
  }

  // User not logged in - let the auth flow handle it
  if (!user) {
    return <>{children}</>;
  }

  // Profile doesn't exist for internal user - should not happen with handle_new_user trigger
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">Erro ao carregar perfil.</p>
          <p className="text-muted-foreground text-sm">Por favor, faça login novamente.</p>
        </div>
      </div>
    );
  }

  // Onboarding not completed - redirect to /onboarding
  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  // Onboarding completed - render children
  return <>{children}</>;
}
