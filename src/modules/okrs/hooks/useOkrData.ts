import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ========================
// ORG OBJECTIVES
// ========================
export function useOrgObjectives(year?: number) {
  return useQuery({
    queryKey: ['okr-org-objectives', year],
    queryFn: async () => {
      let query = supabase
        .from('okr_org_objectives')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useOrgObjectivesWithKrs(year?: number) {
  return useQuery({
    queryKey: ['okr-org-objectives-with-krs', year],
    queryFn: async () => {
      // First get objectives
      let objQuery = supabase
        .from('okr_org_objectives')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (year) {
        objQuery = objQuery.eq('year', year);
      }

      const { data: objectives, error: objError } = await objQuery;
      if (objError) throw objError;

      // Then get all org key results
      const { data: allKrs, error: krsError } = await supabase
        .from('okr_org_key_results')
        .select('*')
        .is('deleted_at', null);
      
      if (krsError) throw krsError;

      // Map KRs to objectives
      const objectivesWithKrs = objectives?.map(obj => ({
        ...obj,
        key_results: allKrs?.filter(kr => kr.org_objective_id === obj.id) || []
      }));

      return objectivesWithKrs;
    },
  });
}

export function useOrgObjective(id: string) {
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

export function useOrgKeyResults(objectiveId?: string) {
  return useQuery({
    queryKey: ['okr-org-key-results', objectiveId],
    queryFn: async () => {
      let query = supabase
        .from('okr_org_key_results')
        .select('*')
        .is('deleted_at', null);
        
      if (objectiveId) {
        query = query.eq('org_objective_id', objectiveId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: objectiveId ? !!objectiveId : true,
  });
}

export function useAllOrgKeyResults() {
  return useQuery({
    queryKey: ['okr-org-key-results-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_org_key_results')
        .select('*')
        .is('deleted_at', null);

      if (error) throw error;
      return data;
    },
  });
}

// ========================
// TEAM OBJECTIVES
// ========================
export function useTeamObjectives(teamId?: string) {
  return useQuery({
    queryKey: ['okr-team-objectives', teamId],
    queryFn: async () => {
      let query = supabase
        .from('okr_team_objectives')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTeamObjectivesWithKrs(teamId?: string) {
  return useQuery({
    queryKey: ['okr-team-objectives-with-krs', teamId],
    queryFn: async () => {
      // First get objectives
      let objQuery = supabase
        .from('okr_team_objectives')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        objQuery = objQuery.eq('team_id', teamId);
      }

      const { data: objectives, error: objError } = await objQuery;
      if (objError) throw objError;

      // Then get all team key results
      let krsQuery = supabase
        .from('okr_team_key_results')
        .select('*')
        .is('deleted_at', null);
      
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
  });
}

export function useTeamKeyResults(teamId?: string) {
  return useQuery({
    queryKey: ['okr-team-key-results', teamId],
    queryFn: async () => {
      let query = supabase
        .from('okr_team_key_results')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useMyTeamKeyResults(userId?: string) {
  return useQuery({
    queryKey: ['okr-my-team-key-results', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('okr_team_key_results')
        .select('*')
        .is('deleted_at', null)
        .or(`owner_user_id.eq.${userId},co_responsibles.cs.{${userId}}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ========================
// CHECK-INS
// ========================
export function useKrCheckins(krId: string) {
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
