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

export function useOrgKeyResults(objectiveId: string) {
  return useQuery({
    queryKey: ['okr-org-key-results', objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_org_key_results')
        .select('*')
        .eq('org_objective_id', objectiveId)
        .is('deleted_at', null);

      if (error) throw error;
      return data;
    },
    enabled: !!objectiveId,
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

// ========================
// HELPER QUERIES
// ========================
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, parent_team_id, leader_user_id')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}

export function useCycles() {
  return useQuery({
    queryKey: ['cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
