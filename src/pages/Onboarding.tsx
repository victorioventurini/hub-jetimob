import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["onboarding-page", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, photo_url, birth_day, birth_month, whatsapp_personal, discord_id, instagram_id, city, state, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const handleOnboardingComplete = () => {
    navigate("/select-bu", { replace: true });
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
      initialData={{
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        photo_url: profile.photo_url || "",
        birth_day: profile.birth_day || 0,
        birth_month: profile.birth_month || 0,
        whatsapp_personal: profile.whatsapp_personal || "",
        discord_id: profile.discord_id || "",
        instagram_id: profile.instagram_id || "",
        city: profile.city || "Porto Alegre",
        state: profile.state || "RS",
      }}
      onComplete={handleOnboardingComplete}
    />
  );
}
