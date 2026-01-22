// ============================================================
// USE RESOLVE PARTICIPANT HOOK - Hub da Jet
// ============================================================
// Hook for resolving a participant ID to unified identity data.
// Uses the resolve_participant_identity RPC.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import type { UnifiedParticipant, ParticipantType } from '@/lib/participantTypes';

/**
 * Hook for resolving a participant ID to unified identity data.
 * 
 * Checks profiles first, then partner_contacts. Useful when you have
 * a participant ID but need the full identity information.
 * 
 * @param participantId - The participant ID to resolve (profile.id or partner_contact.id)
 * @param enabled - Whether the query is enabled (default: true)
 * 
 * @example
 * ```tsx
 * const { participant, isLoading } = useResolveParticipant(ownerId);
 * 
 * if (participant) {
 *   return <ParticipantBadge participant={participant} />;
 * }
 * ```
 */
export function useResolveParticipant(
  participantId: string | null | undefined,
  enabled: boolean = true
) {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useQuery({
    queryKey: queryKeys.participants.resolve(participantId ?? null, buId),
    queryFn: async (): Promise<UnifiedParticipant | null> => {
      if (!supabase || !participantId) return null;

      const { data, error } = await supabase.rpc('resolve_participant_identity', {
        p_participant_id: participantId,
        p_bu_id: buId,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const row = data[0];
      return {
        userType: row.user_type as ParticipantType,
        participantId: row.participant_id,
        authUserId: row.auth_user_id,
        displayName: row.display_name,
        email: row.email,
        photoUrl: row.photo_url,
        buId: buId,
        companyId: row.company_id,
        companyName: row.company_name,
        teamName: row.team_name,
        jobTitle: row.job_title,
      };
    },
    enabled: enabled && !!supabase && !!participantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
