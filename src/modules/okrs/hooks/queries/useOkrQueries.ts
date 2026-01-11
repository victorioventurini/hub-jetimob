/**
 * useOkrQueries - Consolidated OKR Read Queries
 * 
 * This file consolidates all OKR data fetching hooks into a single,
 * well-organized module following TCR standards:
 * - Explicit field selection (no select('*'))
 * - Centralized queryKeys
 * - Proper staleTime for caching
 * - BU-scoped queries
 * 
 * @see TECHNICAL_CONTEXT_REGISTRY.md for standards
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

// ============================================================
// FIELD DEFINITIONS (explicit, no select('*'))
// ============================================================

export const OKR_FIELDS = {
  orgObjective: `
    id, bu_id, title, description, year, status, 
    created_at, updated_at, deleted_at
  ` as const,
  
  orgKr: `
    id, bu_id, org_objective_id, title, baseline, current_value, target,
    direction, unit, status, created_at, updated_at, deleted_at, cancelled_at
  ` as const,
  
  teamObjective: `
    id, bu_id, team_id, title, description, year, status, org_objective_id,
    is_shared, responsibility_model, created_at, updated_at, deleted_at
  ` as const,
  
  teamKr: `
    id, bu_id, team_id, team_objective_id, linked_org_kr_id, parent_kr_id, metric_id,
    title, type, baseline, current_value, target, direction, unit, status,
    owner_user_id, co_responsibles, last_checkin_at, evidence_url,
    created_at, updated_at, deleted_at, cancelled_at
  ` as const,
  
  checkin: `
    id, kr_id, kr_type, user_id, date, previous_value, current_value,
    confidence, comments, blockers, created_at
  ` as const,
} as const;

// Joined fields for complex queries
export const OKR_JOINED_FIELDS = {
  teamObjectiveWithTeam: `
    ${OKR_FIELDS.teamObjective},
    team:teams!okr_team_objectives_team_id_fkey(id, name)
  ` as const,
  
  teamKrWithRelations: `
    ${OKR_FIELDS.teamKr},
    team:teams!okr_team_key_results_team_id_fkey(id, name),
    team_objective:okr_team_objectives!okr_team_key_results_team_objective_id_fkey(id, title),
    owner:profiles!okr_team_key_results_owner_user_id_fkey(id, display_name, photo_url)
  ` as const,
} as const;

// ============================================================
// STALE TIME CONSTANTS
// ============================================================

const STALE_TIME = {
  list: 2 * 60 * 1000,      // 2 minutes for lists
  detail: 5 * 60 * 1000,    // 5 minutes for single items
  checkin: 1 * 60 * 1000,   // 1 minute for frequently updated
} as const;

// ============================================================
// ORG OBJECTIVES QUERIES
// ============================================================

export interface UseOrgObjectivesOptions {
  buId?: string | null;
  year?: number;
  includeAllStatuses?: boolean;
}

// Overload for backward compatibility with positional args
export function useOrgObjectives(buId?: string | null, year?: number, includeAllStatuses?: boolean): ReturnType<typeof useOrgObjectivesImpl>;
export function useOrgObjectives(options?: UseOrgObjectivesOptions): ReturnType<typeof useOrgObjectivesImpl>;
export function useOrgObjectives(
  buIdOrOptions?: string | null | UseOrgObjectivesOptions,
  year?: number,
  includeAllStatuses?: boolean
) {
  // Handle both call signatures
  const options: UseOrgObjectivesOptions = 
    typeof buIdOrOptions === 'object' && buIdOrOptions !== null && !('length' in buIdOrOptions)
      ? buIdOrOptions
      : { buId: buIdOrOptions as string | null | undefined, year, includeAllStatuses };
  
  return useOrgObjectivesImpl(options);
}

function useOrgObjectivesImpl(options: UseOrgObjectivesOptions = {}) {
  const { buId, year, includeAllStatuses = false } = options;
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgObjectives(buId, year),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_org_objectives')
        .select(OKR_FIELDS.orgObjective)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }
      
      if (!includeAllStatuses) {
        query = query.neq('status', 'cancelled');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: STALE_TIME.list,
  });
}

export function useOrgObjective(id: string) {
  const { client: supabase, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgObjective(id),
    queryFn: async () => {
      if (!supabase || !buId) return null;
      
      const { data, error } = await supabase
        .from('okr_org_objectives')
        .select(OKR_FIELDS.orgObjective)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!buId && !!supabase,
    staleTime: STALE_TIME.detail,
  });
}

// ============================================================
// ORG KEY RESULTS QUERIES
// ============================================================

export interface UseOrgKeyResultsOptions {
  buId?: string | null;
  objectiveId?: string;
  includeCancelled?: boolean;
}

// Overload for backward compatibility with positional args
export function useOrgKeyResults(buId?: string | null, objectiveId?: string, includeCancelled?: boolean): ReturnType<typeof useOrgKeyResultsImpl>;
export function useOrgKeyResults(options?: UseOrgKeyResultsOptions): ReturnType<typeof useOrgKeyResultsImpl>;
export function useOrgKeyResults(
  buIdOrOptions?: string | null | UseOrgKeyResultsOptions,
  objectiveId?: string,
  includeCancelled?: boolean
) {
  const options: UseOrgKeyResultsOptions = 
    typeof buIdOrOptions === 'object' && buIdOrOptions !== null && !('length' in buIdOrOptions)
      ? buIdOrOptions
      : { buId: buIdOrOptions as string | null | undefined, objectiveId, includeCancelled };
  
  return useOrgKeyResultsImpl(options);
}

function useOrgKeyResultsImpl(options: UseOrgKeyResultsOptions = {}) {
  const { buId, objectiveId, includeCancelled = false } = options;
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgKeyResults(buId, objectiveId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_org_key_results')
        .select(OKR_FIELDS.orgKr)
        .eq('bu_id', buId)
        .is('deleted_at', null);
        
      if (objectiveId) {
        query = query.eq('org_objective_id', objectiveId);
      }
      
      if (!includeCancelled) {
        query = query.is('cancelled_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: STALE_TIME.list,
  });
}

// ============================================================
// TEAM OBJECTIVES QUERIES
// ============================================================

export interface UseTeamObjectivesOptions {
  buId?: string | null;
  teamId?: string;
  includeAllStatuses?: boolean;
}

// Overload for backward compatibility with positional args
export function useTeamObjectives(buId?: string | null, teamId?: string, includeAllStatuses?: boolean): ReturnType<typeof useTeamObjectivesImpl>;
export function useTeamObjectives(options?: UseTeamObjectivesOptions): ReturnType<typeof useTeamObjectivesImpl>;
export function useTeamObjectives(
  buIdOrOptions?: string | null | UseTeamObjectivesOptions,
  teamId?: string,
  includeAllStatuses?: boolean
) {
  const options: UseTeamObjectivesOptions = 
    typeof buIdOrOptions === 'object' && buIdOrOptions !== null && !('length' in buIdOrOptions)
      ? buIdOrOptions
      : { buId: buIdOrOptions as string | null | undefined, teamId, includeAllStatuses };
  
  return useTeamObjectivesImpl(options);
}

function useTeamObjectivesImpl(options: UseTeamObjectivesOptions = {}) {
  const { buId, teamId, includeAllStatuses = false } = options;
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.teamObjectives(buId, teamId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_team_objectives')
        .select(OKR_FIELDS.teamObjective)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      if (!includeAllStatuses) {
        query = query.neq('status', 'cancelled');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: STALE_TIME.list,
  });
}

// ============================================================
// TEAM KEY RESULTS QUERIES
// ============================================================

export interface UseTeamKeyResultsOptions {
  buId?: string | null;
  teamId?: string;
  userId?: string;
  includeCancelled?: boolean;
}

// Overload for backward compatibility with positional args
export function useTeamKeyResults(buId?: string | null, teamId?: string, includeCancelled?: boolean): ReturnType<typeof useTeamKeyResultsImpl>;
export function useTeamKeyResults(options?: UseTeamKeyResultsOptions): ReturnType<typeof useTeamKeyResultsImpl>;
export function useTeamKeyResults(
  buIdOrOptions?: string | null | UseTeamKeyResultsOptions,
  teamId?: string,
  includeCancelled?: boolean
) {
  const options: UseTeamKeyResultsOptions = 
    typeof buIdOrOptions === 'object' && buIdOrOptions !== null && !('length' in buIdOrOptions)
      ? buIdOrOptions
      : { buId: buIdOrOptions as string | null | undefined, teamId, includeCancelled };
  
  return useTeamKeyResultsImpl(options);
}

function useTeamKeyResultsImpl(options: UseTeamKeyResultsOptions = {}) {
  const { buId, teamId, includeCancelled = false } = options;
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.teamKeyResults(buId, teamId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_team_key_results')
        .select(OKR_FIELDS.teamKr)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      if (!includeCancelled) {
        query = query.is('cancelled_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: STALE_TIME.list,
  });
}

export function useMyTeamKeyResults(buId?: string | null, userId?: string) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.myTeamKeyResults(buId, userId),
    queryFn: async () => {
      if (!buId || !userId || !supabase) return [];
      
      const { data, error } = await supabase
        .from('okr_team_key_results')
        .select(OKR_FIELDS.teamKr)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .or(`owner_user_id.eq.${userId},co_responsibles.cs.{${userId}}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!userId && !!supabase,
    staleTime: STALE_TIME.list,
  });
}

// ============================================================
// CHECK-INS QUERIES
// ============================================================

export function useKrCheckins(krId: string) {
  const { client: supabase, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.checkins(krId),
    queryFn: async () => {
      if (!supabase || !buId) return [];
      
      const { data, error } = await supabase
        .from('okr_checkins')
        .select(OKR_FIELDS.checkin)
        .eq('kr_id', krId)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!krId && !!buId && !!supabase,
    staleTime: STALE_TIME.checkin,
  });
}

export function useLatestCheckinDate() {
  const { client: supabase, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.latestCheckin(),
    queryFn: async () => {
      if (!supabase || !buId) return null;
      
      const { data, error } = await supabase
        .from('okr_checkins')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.created_at;
    },
    enabled: !!buId && !!supabase,
    staleTime: STALE_TIME.checkin,
  });
}

// ============================================================
// HELPER EXPORTS
// ============================================================

export { useTeamsList as useTeams, useCyclesList as useCycles, useUserProfile } from '@/hooks/useSharedData';
