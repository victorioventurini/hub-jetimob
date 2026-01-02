import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingWizard } from "./OnboardingWizard";
import { Loader2 } from "lucide-react";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const { data: profile, isLoading: profileLoading, refetch } = useQuery({
    queryKey: ["onboarding-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, job_title, city, state, work_mode, team_id, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile !== undefined) {
      setOnboardingCompleted(profile?.onboarding_completed ?? false);
    }
  }, [profile]);

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
    refetch();
  };

  // Still loading auth or profile
  if (authLoading || profileLoading || onboardingCompleted === null) {
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

  // Onboarding not completed - show wizard
  if (!onboardingCompleted) {
    return (
      <OnboardingWizard
        profileId={profile.id}
        userId={user.id}
        initialData={{
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          job_title: profile.job_title || "",
          city: profile.city || "Porto Alegre",
          state: profile.state || "RS",
          work_mode: (profile.work_mode as "onsite" | "hybrid" | "remote") || "hybrid",
          team_id: profile.team_id || "",
        }}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Onboarding completed - render children
  return <>{children}</>;
}
