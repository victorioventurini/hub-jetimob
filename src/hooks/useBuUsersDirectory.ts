import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useDebouncedValue } from "@/hooks/useDebounce";

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
  /**
   * When true and `teamId` is set, also includes users belonging to any
   * descendant subteam (recursive via teams.parent_team_id).
   * Default: true (avoid surprising callers who pass a parent team id).
   */
  includeSubteams?: boolean;
  /** Include terminated users (default: false) */
  includeTerminated?: boolean;
  /** Exclude external users/contacts (default: false) */
  excludeExternal?: boolean;
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
    includeSubteams = true,
    includeTerminated = false,
    excludeExternal = false,
    pageSize = 100,
    enabled = true 
  } = options;
  
  const supabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  // Debounce search query to avoid hammering the API on every keystroke
  const debouncedQ = useDebouncedValue(q, 250);

  return useQuery({
    queryKey: queryKeys.users.directory(buId ?? null, { q: debouncedQ, teamId, includeSubteams, includeTerminated, excludeExternal }),
    queryFn: async () => {
      if (!supabase || !buId) return [];

      // Resolve team filter to include descendant subteams when requested.
      // Customer Success / áreas com subtimes precisam exibir todos os
      // membros descendentes ao filtrar pelo time pai.
      let teamIdsFilter: string[] | null = null;
      if (teamId) {
        if (includeSubteams) {
          const { data: allTeams, error: teamsErr } = await supabase
            .from("teams")
            .select("id, parent_team_id")
            .eq("bu_id", buId)
            .is("deleted_at", null);
          if (teamsErr) throw teamsErr;

          const childrenByParent = new Map<string, string[]>();
          (allTeams ?? []).forEach((t) => {
            if (!t.parent_team_id) return;
            const arr = childrenByParent.get(t.parent_team_id) ?? [];
            arr.push(t.id);
            childrenByParent.set(t.parent_team_id, arr);
          });

          const collected = new Set<string>([teamId]);
          const stack = [teamId];
          while (stack.length) {
            const cur = stack.pop()!;
            const children = childrenByParent.get(cur) ?? [];
            for (const c of children) {
              if (!collected.has(c)) {
                collected.add(c);
                stack.push(c);
              }
            }
          }
          teamIdsFilter = Array.from(collected);
        } else {
          teamIdsFilter = [teamId];
        }
      }

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
          created_at,
          user_type
        `)
        .eq("bu_id", buId)
        .order("display_name")
        .limit(pageSize);

      // Filter by terminated status
      if (!includeTerminated) {
        query = query.neq("employment_status", "terminated");
      }

      // Filter out external users if requested
      if (excludeExternal) {
        query = query.eq("user_type", "internal");
      }

      // Filter by team (and descendants when applicable)
      if (teamIdsFilter && teamIdsFilter.length > 0) {
        query = query.in("team_id", teamIdsFilter);
      }

      // Search filter (use debouncedQ)
      if (debouncedQ && debouncedQ.trim()) {
        const searchTerm = `%${debouncedQ.trim()}%`;
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
