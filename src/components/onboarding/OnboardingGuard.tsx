import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { Loader2 } from "lucide-react";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

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

  // Profile doesn't exist - should not happen with handle_new_user trigger
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
