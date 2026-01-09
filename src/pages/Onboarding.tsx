import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading, refetch } = useQuery({
    queryKey: ["onboarding-page", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, birth_day, birth_month, whatsapp_personal, city, state, work_mode, team_id, start_date, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const handleOnboardingComplete = () => {
    refetch();
  };

  // Loading
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

  // Not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // No profile
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

  // Onboarding already completed - redirect to home
  if (profile.onboarding_completed) {
    return <Navigate to="/" replace />;
  }

  // Show onboarding wizard
  return (
    <OnboardingWizard
      profileId={profile.id}
      userId={user.id}
      initialData={{
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        birth_day: profile.birth_day || 0,
        birth_month: profile.birth_month || 0,
        whatsapp_personal: profile.whatsapp_personal || "",
        job_title: "",
        start_date: profile.start_date ? new Date(profile.start_date) : new Date(),
        city: profile.city || "Porto Alegre",
        state: profile.state || "RS",
        work_mode: (profile.work_mode as "onsite" | "hybrid" | "remote") || "hybrid",
        team_id: profile.team_id || "",
      }}
      onComplete={handleOnboardingComplete}
    />
  );
}
