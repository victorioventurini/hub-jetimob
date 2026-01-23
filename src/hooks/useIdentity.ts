/**
 * Hook centralizado para gerenciamento de identidade do usuário.
 * 
 * Este hook resolve a ambiguidade entre user_id (auth.users.id) e profile_id (profiles.id)
 * garantindo que componentes tenham acesso aos dois IDs quando necessário.
 * 
 * IMPORTANTE: Este hook suporta impersonação!
 * - Quando super_admin está impersonando, retorna IDs do usuário impersonado
 * - realUserId/realProfileId sempre retornam o usuário real (para operações de escrita)
 * 
 * @see docs/IDENTITY_CONVENTION.md para regras de uso
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/globalClient";
import { queryKeys } from "@/lib/queryKeys";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";

export interface UserIdentity {
  /** ID de autenticação (auth.users.id) - durante impersonação, é do usuário impersonado */
  userId: string | null;
  /** ID de domínio (profiles.id) - durante impersonação, é do usuário impersonado */
  profileId: string | null;
  /** ID real de autenticação (sempre do usuário logado, ignorando impersonação) */
  realUserId: string | null;
  /** ID real de domínio (sempre do usuário logado, ignorando impersonação) */
  realProfileId: string | null;
  /** Indica se ambos os IDs estão disponíveis */
  isReady: boolean;
  /** Indica se está carregando */
  isLoading: boolean;
  /** Indica se está impersonando */
  isImpersonating: boolean;
}

/**
 * Hook que retorna os IDs de identidade do usuário atual.
 * 
 * Durante impersonação, userId e profileId refletem o usuário impersonado.
 * Para operações que sempre devem usar o usuário real (escrita, mutações),
 * use realUserId e realProfileId.
 * 
 * @example
 * ```tsx
 * const { userId, profileId, realProfileId, isImpersonating } = useIdentity();
 * 
 * // Para leitura de dados (respeitando impersonação)
 * const { data } = useQuery({
 *   queryKey: ['my-data', profileId],
 *   queryFn: () => fetchDataForUser(profileId),
 * });
 * 
 * // Para mutações (SEMPRE usar realProfileId)
 * const mutation = useMutation({
 *   mutationFn: (data) => saveData({ ...data, owner_id: realProfileId }),
 * });
 * ```
 */
export function useIdentity(): UserIdentity {
  const { user, isLoading: authLoading, profile: authProfile } = useAuth();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();
  
  // Fetch profile for the real user
  const { data: realProfile, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.identity.profile(user?.id ?? null),
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      
      if (error) {
        console.error("[useIdentity] Error fetching profile:", error);
        return null;
      }
      
      if (!data) {
        console.warn("[useIdentity] No profile found for user_id:", user.id);
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Fetch user_id for impersonated profile (when impersonating)
  const { data: impersonatedAuthUserId, isLoading: impersonatedUserIdLoading } = useQuery({
    queryKey: ['identity', 'impersonated-auth-user', impersonatedUserId],
    queryFn: async () => {
      if (!impersonatedUserId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", impersonatedUserId)
        .is("deleted_at", null)
        .maybeSingle();
      
      if (error) {
        console.error("[useIdentity] Error fetching impersonated user_id:", error);
        return null;
      }
      
      return data?.user_id ?? null;
    },
    enabled: isImpersonating && !!impersonatedUserId,
    staleTime: 10 * 60 * 1000,
  });
  
  // Real user IDs (always from logged-in user)
  const realUserId = user?.id ?? null;
  const realProfileId = realProfile?.id ?? authProfile?.id ?? null;
  
  // Effective IDs (respects impersonation)
  const userId = isImpersonating && impersonatedAuthUserId 
    ? impersonatedAuthUserId 
    : realUserId;
  const profileId = isImpersonating && impersonatedUserId 
    ? impersonatedUserId 
    : realProfileId;
  
  const isLoading = authLoading || profileLoading || (isImpersonating && impersonatedUserIdLoading);
  const isReady = !isLoading && !!userId && !!profileId;
  
  return {
    userId,
    profileId,
    realUserId,
    realProfileId,
    isReady,
    isLoading,
    isImpersonating,
  };
}

/**
 * Hook simplificado que retorna apenas o profile_id.
 * Útil quando você só precisa do ID de domínio.
 * 
 * NOTA: Este hook respeita impersonação. Durante impersonação,
 * retorna o profileId do usuário impersonado.
 */
export function useProfileId(): string | null {
  const { profileId } = useIdentity();
  return profileId;
}

/**
 * Hook que sempre retorna o profile_id real (ignorando impersonação).
 * Útil para operações de escrita que devem usar o usuário logado.
 */
export function useRealProfileId(): string | null {
  const { realProfileId } = useIdentity();
  return realProfileId;
}
