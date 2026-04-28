import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';

export interface MilestoneOwnerProfile {
  display_name: string | null;
  photo_url: string | null;
}

/**
 * Resolve perfis (display_name + photo_url) para uma lista de owner_ids de milestones.
 *
 * - Owner_id = profiles.id (convenção do projeto).
 * - BU-isolado via useOptionalBuClient.
 * - Retorna mapa { profileId → { display_name, photo_url } } pronto para os
 *   componentes MilestoneList / MilestonesTable que esperam `ownerProfiles`.
 */
export function useMilestoneOwnerProfiles(ownerIds: ReadonlyArray<string | null | undefined>) {
  const { client, isReady, buId } = useOptionalBuClient();

  const uniqueIds = Array.from(
    new Set(ownerIds.filter((id): id is string => !!id)),
  ).sort();

  const { data = {} } = useQuery({
    queryKey: ['projects', 'milestone-owner-profiles', buId, uniqueIds],
    queryFn: async () => {
      const map: Record<string, MilestoneOwnerProfile> = {};
      if (!client || uniqueIds.length === 0) return map;

      const { data, error } = await client
        .from('profiles')
        .select('id, display_name, photo_url')
        .in('id', uniqueIds);

      if (error) {
        console.error('[useMilestoneOwnerProfiles] error:', error);
        return map;
      }

      for (const p of data ?? []) {
        map[p.id as string] = {
          display_name: (p.display_name as string | null) ?? null,
          photo_url: (p.photo_url as string | null) ?? null,
        };
      }
      return map;
    },
    enabled: isReady && uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return data;
}
