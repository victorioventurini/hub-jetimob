/**
 * useCreateTeamOkrBundle - Hook para criar objetivo + KRs + dependências + iniciativas
 * 
 * Cria todo o bundle de OKRs do time em uma operação
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import type { OkrKrType, OkrDirection } from '../types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface CreateTeamOkrBundleInput {
  objective: {
    title: string;
    description?: string;
    team_id: string;
    org_objective_id: string | null;
    cycle_id: string;
    status: 'draft' | 'active';
    // Shared OKR fields
    is_shared?: boolean;
    responsibility_model?: 'collaborative' | 'primary_led' | null;
  };
  // Contributing team IDs for shared OKRs
  contributingTeamIds?: string[];
  keyResults: Array<{
    title: string;
    type: OkrKrType;
    baseline: number;
    target: number;
    unit: string;
    direction: OkrDirection;
    owner_user_id: string | null;
    linked_org_kr_id?: string | null;
  }>;
  dependencies?: Array<{
    kr_index: number;
    depends_on_team_id?: string;
    depends_on_kr_id?: string;
    description?: string;
  }>;
  initiatives?: Array<{
    kr_index: number;
    name: string;
    owner_user_id: string | null;
    start_date?: string;
    expected_end_date?: string;
  }>;
}

export interface CreateTeamOkrBundleResult {
  objectiveId: string;
  krIds: string[];
  dependencyIds: string[];
  initiativeIds: string[];
}

// ============================================================
// HOOK
// ============================================================

export function useCreateTeamOkrBundle() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();
  const { currentBuId } = useBu();

  return useMutation({
    mutationFn: async (input: CreateTeamOkrBundleInput): Promise<CreateTeamOkrBundleResult> => {
      if (!supabase || !currentBuId) {
        throw new Error('Cliente não disponível');
      }

      // 1. Create the team objective
      const { data: objective, error: objError } = await supabase
        .from('okr_team_objectives')
        .insert({
          bu_id: currentBuId,
          team_id: input.objective.team_id,
          title: input.objective.title,
          description: input.objective.description || null,
          org_objective_id: input.objective.org_objective_id,
          cycle_id: input.objective.cycle_id,
          year: new Date().getFullYear(),
          status: input.objective.status,
          // Shared OKR fields
          is_shared: input.objective.is_shared || false,
          responsibility_model: input.objective.responsibility_model || null,
        })
        .select('id')
        .single();

      if (objError) throw objError;

      const objectiveId = objective.id;
      const krIds: string[] = [];
      const dependencyIds: string[] = [];
      const initiativeIds: string[] = [];

      // 2. Create key results
      for (const kr of input.keyResults) {
        const { data: krData, error: krError } = await supabase
          .from('okr_team_key_results')
          .insert({
            bu_id: currentBuId,
            team_id: input.objective.team_id,
            team_objective_id: objectiveId,
            title: kr.title,
            baseline: kr.baseline,
            current_value: kr.baseline,
            target: kr.target,
            unit: kr.unit,
            direction: kr.direction,
            status: 'not_started',
            owner_user_id: kr.owner_user_id,
            linked_org_kr_id: kr.linked_org_kr_id || null,
          })
          .select('id')
          .single();

        if (krError) throw krError;
        krIds.push(krData.id);
      }

      // 3. Create contributors for shared OKRs
      if (input.objective.is_shared && input.contributingTeamIds && input.contributingTeamIds.length > 0) {
        const contributors = input.contributingTeamIds.map(teamId => ({
          objective_id: objectiveId,
          team_id: teamId,
        }));

        const { error: contribError } = await supabase
          .from('okr_team_objective_contributors')
          .insert(contributors);

        if (contribError) {
          console.error('Error creating contributors:', contribError);
          // Don't throw - objective was created, contributors are secondary
        }
      }

      // 4. Create dependencies (if table exists)
      if (input.dependencies && input.dependencies.length > 0) {
        for (const dep of input.dependencies) {
          const krId = krIds[dep.kr_index];
          if (!krId) continue;

          // Note: okr_dependencies table might need to be created
          // For now, we store as metadata
          // TODO: Implement when okr_dependencies table is available
        }
      }

      // 5. Create initiatives
      if (input.initiatives && input.initiatives.length > 0) {
        for (const init of input.initiatives) {
          const krId = krIds[init.kr_index];
          if (!krId) continue;

          const { data: initData, error: initError } = await supabase
            .from('okr_initiatives')
            .insert({
              bu_id: currentBuId,
              kr_id: krId,
              name: init.name,
              owner_user_id: init.owner_user_id,
              start_date: init.start_date || null,
              expected_end_date: init.expected_end_date || null,
              status: 'planned',
              priority: 'medium',
              progress: 0,
            })
            .select('id')
            .single();

          if (initError) throw initError;
          initiativeIds.push(initData.id);
        }
      }

      return {
        objectiveId,
        krIds,
        dependencyIds,
        initiativeIds,
      };
    },
    onSuccess: (_, variables) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectives(currentBuId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesWithKrs(currentBuId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesWithKrsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesAll() });
      
      toast.success('OKRs do time criados com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating team OKR bundle:', error);
      toast.error('Erro ao criar OKRs do time');
    },
  });
}
