// ============================================================
// USE BU PARTICIPANTS DIRECTORY HOOK - Hub da Jet
// ============================================================
// Hook for listing all participants (internal + external) in the current BU.
// Uses the unified v_all_participants view.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { useDebouncedValue } from '@/hooks/useDebounce';
import type { UnifiedParticipant } from '@/lib/participantTypes';
import { mapToUnifiedParticipant } from '@/lib/participantTypes';

export interface UseBuParticipantsDirectoryOptions {
  /** Search query for filtering by name/email */
  q?: string;
  
  /** Include external participants (default: true) */
  includeExternal?: boolean;
  
  /** Filter by company ID (external participants only) */
  companyId?: string;
  
  /** Filter by team ID (internal participants only) */
  teamId?: string;
  
  /** Page size for pagination (default: 100) */
  pageSize?: number;
  
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Hook for listing all participants in the current BU.
 * 
 * Combines internal users (profiles) and external users (partner_contacts)
 * into a single unified list using the v_all_participants view.
 * 
 * @example
 * ```tsx
 * // List all participants
 * const { participants, isLoading } = useBuParticipantsDirectory();
 * 
 * // Search participants
 * const { participants } = useBuParticipantsDirectory({ q: searchTerm });
 * 
 * // Internal only
 * const { participants } = useBuParticipantsDirectory({ includeExternal: false });
 * ```
 */
export function useBuParticipantsDirectory(options: UseBuParticipantsDirectoryOptions = {}) {
  const {
    q,
    includeExternal = true,
    companyId,
    teamId,
    pageSize = 100,
    enabled = true,
  } = options;

  const supabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  // Debounce search query
  const debouncedQ = useDebouncedValue(q, 250);

  return useQuery({
    queryKey: queryKeys.participants.list(buId ?? null, { 
      q: debouncedQ, 
      includeExternal, 
      companyId, 
      teamId 
    }),
    queryFn: async (): Promise<UnifiedParticipant[]> => {
      if (!supabase || !buId) return [];

      let query = supabase
        .from('v_all_participants')
        .select(`
          user_type,
          participant_id,
          auth_user_id,
          display_name,
          email,
          photo_url,
          bu_id,
          company_id,
          company_name,
          team_name,
          job_title,
          status
        `)
        .eq('bu_id', buId)
        .order('display_name')
        .limit(pageSize);

      // Filter by user type if not including external
      if (!includeExternal) {
        query = query.eq('user_type', 'internal');
      }

      // Filter by company (external only)
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      // Filter by team (internal only)
      if (teamId) {
        query = query.eq('team_name', teamId); // Note: team_name not team_id in view
      }

      // Search filter
      if (debouncedQ && debouncedQ.trim()) {
        const searchTerm = `%${debouncedQ.trim()}%`;
        query = query.or(`display_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(mapToUnifiedParticipant);
    },
    enabled: enabled && !!supabase && !!buId,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

/**
 * Simplified hook for participant select components.
 * Returns participants formatted for select options.
 */
export function useBuParticipantSelectOptions(options: Omit<UseBuParticipantsDirectoryOptions, 'pageSize'> = {}) {
  const { data: participants = [], isLoading, error } = useBuParticipantsDirectory({
    ...options,
    pageSize: 200, // Higher limit for selects
  });

  const selectOptions = participants.map(p => ({
    value: p.participantId,
    label: p.displayName,
    participant: p,
  }));

  return {
    options: selectOptions,
    participants,
    isLoading,
    error,
  };
}
