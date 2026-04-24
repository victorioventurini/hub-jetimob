/**
 * Verifica via RPC se o usuário corrente (profile_id efetivo) é líder do
 * dono de um projeto numa BU. Mantém o gate de UI alinhado à RLS canônica
 * (`is_leader_of_project_owner` no banco) sem duplicar a hierarquia no
 * frontend.
 */
import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useIdentity } from "@/hooks/useIdentity";

export function useIsLeaderOfProjectOwner(
  ownerProfileId: string | null | undefined,
) {
  const { client, isReady, buId } = useOptionalBuClient();
  const { profileId, realProfileId, isLoading: identityLoading } = useIdentity();
  const leaderProfileId = realProfileId ?? profileId ?? null;

  return useQuery({
    queryKey: [
      "projects",
      "is-leader-of-owner",
      buId ?? null,
      leaderProfileId ?? null,
      ownerProfileId ?? null,
    ] as const,
    queryFn: async () => {
      if (!client || !buId || !leaderProfileId || !ownerProfileId) return false;
      // Auto-check trivial: se o solicitante é o próprio owner, esta função
      // específica não se aplica (a checagem de owner é feita à parte).
      if (leaderProfileId === ownerProfileId) return false;

      const { data, error } = await client.rpc("is_leader_of_project_owner", {
        p_leader_profile_id: leaderProfileId,
        p_owner_profile_id: ownerProfileId,
        p_bu_id: buId,
      });
      if (error) {
        console.error(
          "[useIsLeaderOfProjectOwner] RPC error",
          { code: error.code, message: error.message },
        );
        return false;
      }
      return Boolean(data);
    },
    enabled:
      isReady &&
      !identityLoading &&
      !!client &&
      !!buId &&
      !!leaderProfileId &&
      !!ownerProfileId,
    staleTime: 5 * 60 * 1000,
  });
}
