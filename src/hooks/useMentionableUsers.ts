// ============================================================
// USE MENTIONABLE USERS HOOK - Hub da Jet
// ============================================================
// Unified hook for searching mentionable users across modules.
// Supports two contexts:
// - 'internal': Only internal users (profiles) from the BU
// - 'internal+external': Internal users + external contacts
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import type { 
  MentionContext, 
  MentionCandidate, 
  InternalUserCandidate 
} from '@/lib/mentions';

// ============================================================
// TYPES
// ============================================================

export interface UseMentionableUsersOptions {
  /** 
   * Context determines which users can be mentioned:
   * - 'internal': Only internal users (profiles) from the BU
   * - 'internal+external': Internal users + external contacts from a partner company
   */
  context: MentionContext;
  
  /**
   * Partner company ID - required when context is 'internal+external'.
   * Used to filter external contacts to those belonging to this company.
   */
  partnerCompanyId?: string | null;
  
  /**
   * Search term to filter candidates by name/email.
   */
  searchTerm?: string;
  
  /**
   * Maximum number of results to return.
   * @default 10
   */
  limit?: number;
  
  /**
   * Whether the query is enabled.
   * @default true
   */
  enabled?: boolean;
}

export interface UseMentionableUsersResult {
  /** Combined list of mention candidates (internal + external if applicable) */
  candidates: MentionCandidate[];
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Whether the query has been fetched at least once */
  isFetched: boolean;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useMentionableUsers(
  options: UseMentionableUsersOptions
): UseMentionableUsersResult {
  const { 
    context, 
    partnerCompanyId, 
    searchTerm = '', 
    limit = 10,
    enabled = true 
  } = options;
  
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id ?? null;

  // Validate options for 'internal+external' context with partner company
  const hasPartnerCompany = !!partnerCompanyId;

  // Query for 'internal+external' context WITH partner company - uses search_mention_candidates RPC
  const combinedQuery = useQuery({
    queryKey: queryKeys.mentions.candidates(buId, context, partnerCompanyId ?? null, searchTerm),
    queryFn: async (): Promise<MentionCandidate[]> => {
      if (!buId) return [];

      const { data, error } = await supabase.rpc('search_mention_candidates', {
        p_bu_id: buId,
        p_partner_company_id: partnerCompanyId || null,
        p_search_term: searchTerm || null,
        p_limit: limit,
      });

      if (error) throw error;

      return (data || []).map(u => ({
        id: u.id,
        entity_id: u.entity_id,
        entity_type: u.entity_type as 'internal_user' | 'partner_contact',
        display_name: u.display_name,
        email: u.email || null,
        photo_url: u.photo_url || null,
        team_name: u.team_name || null,
        partner_company_name: u.partner_company_name || null,
      }));
    },
    // Only enable when we have a partner company selected
    enabled: enabled && !!buId && context === 'internal+external' && hasPartnerCompany,
  });

  // Query for 'internal' context OR 'internal+external' without partner company
  // Uses search_bu_users_for_mention RPC (internal users only)
  const internalQuery = useQuery({
    queryKey: queryKeys.mentions.internalCandidates(buId, searchTerm),
    queryFn: async (): Promise<MentionCandidate[]> => {
      if (!buId) return [];

      const { data, error } = await supabase.rpc('search_bu_users_for_mention', {
        p_bu_id: buId,
        p_search_term: searchTerm || null,
        p_limit: limit,
      });

      if (error) throw error;

      // Transform InternalUserCandidate to MentionCandidate for unified interface
      return (data || []).map((u): MentionCandidate => ({
        id: u.id,
        entity_id: u.user_id, // user_id is the profile.user_id (auth.users.id)
        entity_type: 'internal_user',
        display_name: u.display_name,
        email: u.email || null,
        photo_url: u.photo_url || null,
        team_name: u.team_name || null,
        partner_company_name: null,
      }));
    },
    // Enable for 'internal' context OR 'internal+external' without partner company
    enabled: enabled && !!buId && (context === 'internal' || (context === 'internal+external' && !hasPartnerCompany)),
  });

  // Select the appropriate query based on context and partner company availability
  const activeQuery = (context === 'internal+external' && hasPartnerCompany) ? combinedQuery : internalQuery;

  return {
    candidates: (activeQuery.data ?? []) as MentionCandidate[],
    isLoading: activeQuery.isLoading,
    error: activeQuery.error as Error | null,
    isFetched: activeQuery.isFetched,
  };
}

// ============================================================
// CONVENIENCE HOOKS
// ============================================================

/**
 * Hook for internal-only mentions (OKRs, internal comments, etc.)
 */
export function useInternalMentionableUsers(
  searchTerm: string = '',
  enabled: boolean = true
) {
  return useMentionableUsers({
    context: 'internal',
    searchTerm,
    enabled,
  });
}

/**
 * Hook for ticket mentions (internal + external contacts)
 */
export function useTicketMentionableUsers(
  partnerCompanyId: string | null,
  searchTerm: string = '',
  enabled: boolean = true
) {
  return useMentionableUsers({
    context: 'internal+external',
    partnerCompanyId,
    searchTerm,
    enabled,
  });
}
