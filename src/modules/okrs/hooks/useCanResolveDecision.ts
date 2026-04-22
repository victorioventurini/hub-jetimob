/**
 * useCanResolveDecision - Verifica se o usuário logado pode resolver uma decisão/registro.
 * 
 * Regra: pode resolver se é:
 * 1. O próprio responsável (owner)
 * 2. Admin da BU (isWildcard)
 * 3. Líder de time onde o owner é membro (incluindo sub-times via parent_team_id)
 * 4. Líder de área do time do owner
 */

import { useQuery } from '@tanstack/react-query';
import { useIdentity } from '@/hooks/useIdentity';
import { usePermissions } from '@/hooks/usePermissions';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { okrsKeys } from '@/lib/queryKeys/okrs';

interface UseCanResolveDecisionResult {
  canResolve: boolean;
  isLoading: boolean;
}

export function useCanResolveDecision(ownerProfileId: string | undefined): UseCanResolveDecisionResult {
  const { profileId, isLoading: identityLoading } = useIdentity();
  const { isWildcard, isLoading: permLoading } = usePermissions();
  const buSupabase = useOptionalBuScopedSupabase();

  // Quick checks before querying
  const isSelf = !!profileId && !!ownerProfileId && profileId === ownerProfileId;
  const needsLeadershipCheck = !isSelf && !isWildcard && !!profileId && !!ownerProfileId;

  const { data: isLeader = false, isLoading: leaderLoading } = useQuery<boolean>({
    queryKey: okrsKeys.canResolveDecision(profileId, ownerProfileId),
    queryFn: async (): Promise<boolean> => {
      if (!buSupabase || !profileId || !ownerProfileId) return false;

      // 1. Get owner's team memberships
      const { data: memberships, error: memErr } = await (buSupabase as any)
        .from('user_team_memberships')
        .select('team_id')
        .eq('profile_id', ownerProfileId)
        .is('deleted_at', null);

      if (memErr || !memberships?.length) return false;

      const teamIds = memberships.map(m => m.team_id);

      // 2. Check if current user is leader of any of those teams (or parent teams)
      // Fetch the teams + their parent chains
      const { data: teams, error: teamErr } = await (buSupabase as any)
        .from('teams')
        .select('id, leader_user_id, parent_team_id, area_id')
        .in('id', teamIds)
        .is('deleted_at', null);

      if (teamErr || !teams?.length) return false;

      // Direct team leader check
      if (teams.some(t => t.leader_user_id === profileId)) return true;

      // Parent team leader check (one level up)
      const parentIds = teams
        .map(t => t.parent_team_id)
        .filter((id): id is string => !!id);

      if (parentIds.length > 0) {
        const { data: parentTeams } = await (buSupabase as any)
          .from('teams')
          .select('id, leader_user_id, parent_team_id')
          .in('id', parentIds)
          .is('deleted_at', null);

        if (parentTeams?.some(t => t.leader_user_id === profileId)) return true;

        // Grandparent check (sub-time → time → time pai)
        const grandparentIds = (parentTeams ?? [])
          .map(t => t.parent_team_id)
          .filter((id): id is string => !!id);

        if (grandparentIds.length > 0) {
          const { data: gpTeams } = await (buSupabase as any)
            .from('teams')
            .select('id, leader_user_id')
            .in('id', grandparentIds)
            .is('deleted_at', null);

          if (gpTeams?.some(t => t.leader_user_id === profileId)) return true;
        }
      }

      // 3. Area leader check
      const areaIds = teams
        .map(t => t.area_id)
        .filter((id): id is string => !!id);

      if (areaIds.length > 0) {
        const uniqueAreaIds = [...new Set(areaIds)];
        const { data: areas } = await (buSupabase as any)
          .from('areas')
          .select('id, leader_user_id')
          .in('id', uniqueAreaIds)
          .is('deleted_at', null);

        if (areas?.some(a => a.leader_user_id === profileId)) return true;
      }

      return false;
    },
    enabled: needsLeadershipCheck && !!buSupabase,
    staleTime: 5 * 60 * 1000,
  });

  const baseLoading = identityLoading || permLoading;

  if (isSelf || isWildcard) {
    return { canResolve: !baseLoading && (isSelf || isWildcard), isLoading: baseLoading };
  }

  return {
    canResolve: isLeader,
    isLoading: baseLoading || (needsLeadershipCheck && leaderLoading),
  };
}
