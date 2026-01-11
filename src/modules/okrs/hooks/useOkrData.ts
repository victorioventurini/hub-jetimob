import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

// ============================================================
// Performance-optimized OKR data hooks
// - Uses explicit field selection (no select('*'))
// - Uses centralized queryKeys
// - Applies proper staleTime for caching
// ============================================================

// Fields used in most org objectives queries
const ORG_OBJECTIVE_FIELDS = `
  id, bu_id, title, description, year, status, 
  created_at, updated_at, deleted_at
` as const;

// Fields used in most org KR queries
const ORG_KR_FIELDS = `
  id, bu_id, org_objective_id, title, baseline, current_value, target,
  direction, unit, status, created_at, updated_at, deleted_at, cancelled_at
` as const;

// Fields used in most team objectives queries
const TEAM_OBJECTIVE_FIELDS = `
  id, bu_id, team_id, title, description, year, status, org_objective_id,
  is_shared, responsibility_model, created_at, updated_at, deleted_at
` as const;

// Fields used in most team KR queries
const TEAM_KR_FIELDS = `
  id, bu_id, team_id, team_objective_id, linked_org_kr_id, parent_kr_id, metric_id,
  title, type, baseline, current_value, target, direction, unit, status,
  owner_user_id, co_responsibles, last_checkin_at, evidence_url,
  created_at, updated_at, deleted_at, cancelled_at
` as const;

// ========================
// ORG OBJECTIVES
// ========================
export function useOrgObjectives(buId?: string | null, year?: number, includeAllStatuses: boolean = false) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgObjectives(buId, year),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_org_objectives')
        .select(ORG_OBJECTIVE_FIELDS)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }
      
      // By default, exclude cancelled objectives
      if (!includeAllStatuses) {
        query = query.neq('status', 'cancelled');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useOrgObjectivesWithKrs(buId?: string | null, year?: number, includeAllStatuses: boolean = false) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgObjectivesWithKrs(buId, year),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      // First get objectives with explicit fields
      let objQuery = supabase
        .from('okr_org_objectives')
        .select(ORG_OBJECTIVE_FIELDS)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (year) {
        objQuery = objQuery.eq('year', year);
      }
      
      // By default, exclude cancelled objectives
      if (!includeAllStatuses) {
        objQuery = objQuery.neq('status', 'cancelled');
      }

      const { data: objectives, error: objError } = await objQuery;
      if (objError) throw objError;
      if (!objectives?.length) return [];

      // Get objective IDs for IN clause (more efficient than fetching all)
      const objectiveIds = objectives.map(o => o.id);

      // Fetch KRs for these objectives only (server-side filter)
      const { data: allKrs, error: krsError } = await supabase
        .from('okr_org_key_results')
        .select(ORG_KR_FIELDS)
        .in('org_objective_id', objectiveIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      
      if (krsError) throw krsError;

      // Map KRs to objectives
      const objectivesWithKrs = objectives.map(obj => ({
        ...obj,
        key_results: allKrs?.filter(kr => kr.org_objective_id === obj.id) || []
      }));

      return objectivesWithKrs;
    },
    enabled: !!buId && !!supabase,
    staleTime: 2 * 60 * 1000,
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
        .select(ORG_OBJECTIVE_FIELDS)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!buId && !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes for single item
  });
}

export function useOrgKeyResults(buId?: string | null, objectiveId?: string, includeCancelled: boolean = false) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgKeyResults(buId, objectiveId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_org_key_results')
        .select(ORG_KR_FIELDS)
        .eq('bu_id', buId)
        .is('deleted_at', null);
        
      if (objectiveId) {
        query = query.eq('org_objective_id', objectiveId);
      }
      
      // By default, exclude cancelled KRs
      if (!includeCancelled) {
        query = query.is('cancelled_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllOrgKeyResults(buId?: string | null, includeCancelled: boolean = false) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.orgKeyResultsAllBu(buId ?? null),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_org_key_results')
        .select(ORG_KR_FIELDS)
        .eq('bu_id', buId)
        .is('deleted_at', null);

      // By default, exclude cancelled KRs
      if (!includeCancelled) {
        query = query.is('cancelled_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

// ========================
// TEAM OBJECTIVES
// ========================
export function useTeamObjectives(buId?: string | null, teamId?: string, includeAllStatuses: boolean = false) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.teamObjectives(buId, teamId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_team_objectives')
        .select(TEAM_OBJECTIVE_FIELDS)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      // By default, exclude cancelled objectives from lists
      if (!includeAllStatuses) {
        query = query.neq('status', 'cancelled');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTeamObjectivesWithKrs(buId?: string | null, teamId?: string, includeAllStatuses: boolean = false) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.teamObjectivesWithKrs(buId, teamId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      // First get objectives with team info (using join for team name)
      let objQuery = supabase
        .from('okr_team_objectives')
        .select(`
          ${TEAM_OBJECTIVE_FIELDS},
          team:teams!okr_team_objectives_team_id_fkey(id, name)
        `)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        objQuery = objQuery.eq('team_id', teamId);
      }
      
      // By default, exclude cancelled objectives
      if (!includeAllStatuses) {
        objQuery = objQuery.neq('status', 'cancelled');
      }

      const { data: objectives, error: objError } = await objQuery;
      if (objError) throw objError;
      if (!objectives?.length) return [];

      // Get objective IDs for IN clause
      const objectiveIds = objectives.map(o => o.id);

      // Fetch KRs for these objectives only (server-side filter)
      let krsQuery = supabase
        .from('okr_team_key_results')
        .select(TEAM_KR_FIELDS)
        .in('team_objective_id', objectiveIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      
      if (teamId) {
        krsQuery = krsQuery.eq('team_id', teamId);
      }

      const { data: allKrs, error: krsError } = await krsQuery;
      if (krsError) throw krsError;

      // Map KRs to objectives
      const objectivesWithKrs = objectives.map(obj => ({
        ...obj,
        key_results: allKrs?.filter(kr => kr.team_objective_id === obj.id) || []
      }));

      return objectivesWithKrs;
    },
    enabled: !!buId && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTeamKeyResults(buId?: string | null, teamId?: string, includeCancelled: boolean = false) {
  const { client: supabase } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.teamKeyResults(buId, teamId),
    queryFn: async () => {
      if (!buId || !supabase) return [];
      
      let query = supabase
        .from('okr_team_key_results')
        .select(TEAM_KR_FIELDS)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      // By default, exclude cancelled KRs
      if (!includeCancelled) {
        query = query.is('cancelled_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!supabase,
    staleTime: 2 * 60 * 1000,
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
        .select(TEAM_KR_FIELDS)
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .or(`owner_user_id.eq.${userId},co_responsibles.cs.{${userId}}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!userId && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

// ========================
// CHECK-INS
// ========================

// Fields for check-in queries
const CHECKIN_FIELDS = `
  id, kr_id, kr_type, user_id, date, previous_value, current_value,
  confidence, comments, blockers, created_at
` as const;

export function useKrCheckins(krId: string) {
  const { client: supabase, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.checkins(krId),
    queryFn: async () => {
      if (!supabase || !buId) return [];
      
      const { data, error } = await supabase
        .from('okr_checkins')
        .select(CHECKIN_FIELDS)
        .eq('kr_id', krId)
        .order('date', { ascending: false })
        .limit(100); // Limit to prevent over-fetching

      if (error) throw error;
      return data;
    },
    enabled: !!krId && !!buId && !!supabase,
    staleTime: 1 * 60 * 1000, // 1 minute for frequently updated data
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
    staleTime: 1 * 60 * 1000,
  });
}

// ========================
// HELPER QUERIES
// ========================
// Re-export from shared hooks for backward compatibility
export { useTeamsList as useTeams, useCyclesList as useCycles, useUserProfile } from '@/hooks/useSharedData';
