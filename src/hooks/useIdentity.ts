/**
 * Hook centralizado para gerenciamento de identidade do usuário.
 * 
 * Este hook resolve a ambiguidade entre user_id (auth.users.id) e profile_id (profiles.id)
 * garantindo que componentes tenham acesso aos dois IDs quando necessário.
 * 
 * @see docs/IDENTITY_CONVENTION.md para regras de uso
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface UserIdentity {
  /** ID de autenticação (auth.users.id) - usar para auth checks, RLS */
  userId: string | null;
  /** ID de domínio (profiles.id) - usar para ownership, relações de domínio */
  profileId: string | null;
  /** Indica se ambos os IDs estão disponíveis */
  isReady: boolean;
  /** Indica se está carregando */
  isLoading: boolean;
}

/**
 * Hook que retorna os IDs de identidade do usuário atual.
 * 
 * @example
 * ```tsx
 * const { userId, profileId, isReady } = useIdentity();
 * 
 * // Para operações de autenticação/autorização
 * const isAdmin = await checkAdmin(userId);
 * 
 * // Para ownership de entidades de domínio
 * await supabase.from("okr_initiatives").insert({ owner_user_id: profileId });
 * ```
 */
export function useIdentity(): UserIdentity {
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["identity-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching profile for identity:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - profile ID rarely changes
  });
  
  const userId = user?.id ?? null;
  const profileId = profile?.id ?? null;
  const isLoading = authLoading || profileLoading;
  const isReady = !isLoading && !!userId && !!profileId;
  
  return {
    userId,
    profileId,
    isReady,
    isLoading,
  };
}

/**
 * Hook simplificado que retorna apenas o profile_id.
 * Útil quando você só precisa do ID de domínio.
 */
export function useProfileId(): string | null {
  const { profileId } = useIdentity();
  return profileId;
}
