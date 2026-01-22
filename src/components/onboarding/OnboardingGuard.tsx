import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { queryKeys } from "@/lib/queryKeys";
import { Loader2 } from "lucide-react";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * OnboardingGuard
 * 
 * Guards routes that require onboarding completion.
 * 
 * IMPORTANT: External users (partner_contacts) do NOT have profiles,
 * so we must detect them and bypass the profile-based onboarding check.
 * Per IDENTITY_CONVENTION.md, external users are identified via partner_contacts table.
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { isExternal, isLoading: externalLoading } = useExternalUser();

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

  // Still loading auth, profile, or external status
  if (authLoading || profileLoading || externalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // User not logged in - let the auth flow handle it
  if (!user) {
    return <>{children}</>;
  }

  // External users bypass onboarding entirely - they don't have profiles
  // Per IDENTITY_CONVENTION.md and global-partner-contacts-v2 memory
  if (isExternal) {
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
