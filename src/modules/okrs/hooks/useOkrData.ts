import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';

// ========================
// ORG OBJECTIVES
// ========================
export function useOrgObjectives(buId?: string | null, year?: number, includeAllStatuses: boolean = false) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-org-objectives', buId, year, includeAllStatuses],
    queryFn: async () => {
      if (!buId) return [];
      
      let query = supabase
        .from('okr_org_objectives')
        .select('*')
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
    enabled: !!buId,
  });
}

export function useOrgObjectivesWithKrs(buId?: string | null, year?: number, includeAllStatuses: boolean = false) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-org-objectives-with-krs', buId, year, includeAllStatuses],
    queryFn: async () => {
      if (!buId) return [];
      
      // First get objectives
      let objQuery = supabase
        .from('okr_org_objectives')
        .select('*')
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

      // Then get org key results for this BU (non-cancelled)
      const { data: allKrs, error: krsError } = await supabase
        .from('okr_org_key_results')
        .select('*')
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      
      if (krsError) throw krsError;

      // Map KRs to objectives
      const objectivesWithKrs = objectives?.map(obj => ({
        ...obj,
        key_results: allKrs?.filter(kr => kr.org_objective_id === obj.id) || []
      }));

      return objectivesWithKrs;
    },
    enabled: !!buId,
  });
}

export function useOrgObjective(id: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-org-objective', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_org_objectives')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useOrgKeyResults(buId?: string | null, objectiveId?: string, includeCancelled: boolean = false) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-org-key-results', buId, objectiveId, includeCancelled],
    queryFn: async () => {
      if (!buId) return [];
      
      let query = supabase
        .from('okr_org_key_results')
        .select('*')
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
    enabled: !!buId,
  });
}

export function useAllOrgKeyResults(buId?: string | null, includeCancelled: boolean = false) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-org-key-results-all', buId, includeCancelled],
    queryFn: async () => {
      if (!buId) return [];
      
      let query = supabase
        .from('okr_org_key_results')
        .select('*')
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
    enabled: !!buId,
  });
}

// ========================
// TEAM OBJECTIVES
// ========================
export function useTeamObjectives(buId?: string | null, teamId?: string, includeAllStatuses: boolean = false) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-team-objectives', buId, teamId, includeAllStatuses],
    queryFn: async () => {
      if (!buId) return [];
      
      let query = supabase
        .from('okr_team_objectives')
        .select('*')
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
    enabled: !!buId,
  });
}

export function useTeamObjectivesWithKrs(buId?: string | null, teamId?: string, includeAllStatuses: boolean = false) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-team-objectives-with-krs', buId, teamId, includeAllStatuses],
    queryFn: async () => {
      if (!buId) return [];
      
      // First get objectives
      let objQuery = supabase
        .from('okr_team_objectives')
        .select('*')
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

      // Then get team key results for this BU (non-cancelled)
      let krsQuery = supabase
        .from('okr_team_key_results')
        .select('*')
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      
      if (teamId) {
        krsQuery = krsQuery.eq('team_id', teamId);
      }

      const { data: allKrs, error: krsError } = await krsQuery;
      if (krsError) throw krsError;

      // Map KRs to objectives
      const objectivesWithKrs = objectives?.map(obj => ({
        ...obj,
        key_results: allKrs?.filter(kr => kr.team_objective_id === obj.id) || []
      }));

      return objectivesWithKrs;
    },
    enabled: !!buId,
  });
}

export function useTeamKeyResults(buId?: string | null, teamId?: string, includeCancelled: boolean = false) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-team-key-results', buId, teamId, includeCancelled],
    queryFn: async () => {
      if (!buId) return [];
      
      let query = supabase
        .from('okr_team_key_results')
        .select('*')
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
    enabled: !!buId,
  });
}

export function useMyTeamKeyResults(buId?: string | null, userId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-my-team-key-results', buId, userId],
    queryFn: async () => {
      if (!buId || !userId) return [];
      
      const { data, error } = await supabase
        .from('okr_team_key_results')
        .select('*')
        .eq('bu_id', buId)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .or(`owner_user_id.eq.${userId},co_responsibles.cs.{${userId}}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!buId && !!userId,
  });
}

// ========================
// CHECK-INS
// ========================
export function useKrCheckins(krId: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-checkins', krId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_checkins')
        .select('*')
        .eq('kr_id', krId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!krId,
  });
}

export function useLatestCheckinDate() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['okr-latest-checkin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_checkins')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.created_at;
    },
  });
}

// ========================
// HELPER QUERIES
// ========================
// Re-export from shared hooks for backward compatibility
export { useTeamsList as useTeams, useCyclesList as useCycles, useUserProfile } from '@/hooks/useSharedData';
