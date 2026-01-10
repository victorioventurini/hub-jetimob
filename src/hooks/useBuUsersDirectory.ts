import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Profile from the canonical user directory view
 */
export interface DirectoryProfile {
  id: string; // profile_id - use this for all assignments
  user_id: string | null; // auth user_id - may be null if user hasn't logged in
  display_name: string;
  first_name: string;
  last_name: string;
  work_email: string;
  photo_url: string | null;
  team_id: string | null;
  team_name: string | null;
  job_title_id: string | null;
  job_title_name: string | null;
  employment_status: 'active' | 'vacation' | 'terminated' | 'external';
  onboarding_completed: boolean;
  has_bu_membership: boolean;
  start_date: string | null;
  created_at: string;
}

interface UseBuUsersDirectoryOptions {
  /** Search query for filtering by name/email */
  q?: string;
  /** Filter by specific team */
  teamId?: string;
  /** Include terminated users (default: false) */
  includeTerminated?: boolean;
  /** Page size for pagination (default: 100) */
  pageSize?: number;
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Canonical hook for listing users in the current BU.
 * 
 * RULES (Global Standard):
 * - Shows ALL registered profiles in the BU
 * - Does NOT filter by onboarding_completed
 * - Does NOT filter by membership existence
 * - Does NOT require user to have logged in
 * - ONLY filters out terminated users (unless includeTerminated=true)
 * 
 * @returns profiles - Array of DirectoryProfile with profile_id as primary identifier
 */
export function useBuUsersDirectory(options: UseBuUsersDirectoryOptions = {}) {
  const { 
    q, 
    teamId, 
    includeTerminated = false, 
    pageSize = 100,
    enabled = true 
  } = options;
  
  const supabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: queryKeys.users.directory(buId ?? null, { q, teamId, includeTerminated }),
    queryFn: async () => {
      if (!supabase || !buId) return [];

      // Query the canonical view
      let query = supabase
        .from("v_bu_active_profiles")
        .select(`
          id,
          user_id,
          display_name,
          first_name,
          last_name,
          work_email,
          photo_url,
          team_id,
          team_name,
          job_title_id,
          job_title_name,
          employment_status,
          onboarding_completed,
          has_bu_membership,
          start_date,
          created_at
        `)
        .eq("bu_id", buId)
        .order("display_name")
        .limit(pageSize);

      // Filter by terminated status
      if (!includeTerminated) {
        query = query.neq("employment_status", "terminated");
      }

      // Filter by team if specified
      if (teamId) {
        query = query.eq("team_id", teamId);
      }

      // Search filter
      if (q && q.trim()) {
        const searchTerm = `%${q.trim()}%`;
        query = query.or(`display_name.ilike.${searchTerm},work_email.ilike.${searchTerm}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as DirectoryProfile[];
    },
    enabled: enabled && !!supabase && !!buId,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

/**
 * Simplified hook for user select components.
 * Returns profiles formatted for select options.
 */
export function useBuUserSelectOptions(options: Omit<UseBuUsersDirectoryOptions, 'pageSize'> = {}) {
  const { data: profiles = [], isLoading, error } = useBuUsersDirectory({
    ...options,
    pageSize: 200, // Higher limit for selects
  });

  const selectOptions = profiles.map(p => ({
    value: p.id, // Always use profile_id
    label: p.display_name,
    profile: p,
  }));

  return {
    options: selectOptions,
    profiles,
    isLoading,
    error,
  };
}
