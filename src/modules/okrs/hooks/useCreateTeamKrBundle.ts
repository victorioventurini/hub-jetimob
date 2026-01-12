/**
 * useCreateTeamKrBundle - Hook para criar múltiplos KRs para um objetivo existente
 * 
 * Cria KRs + dependências + iniciativas em batch para um objetivo de time
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

export interface CreateTeamKrBundleInput {
  objectiveId: string;
  teamId: string;
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

export interface CreateTeamKrBundleResult {
  krIds: string[];
  dependencyIds: string[];
  initiativeIds: string[];
}

// ============================================================
// HOOK
// ============================================================

export function useCreateTeamKrBundle() {
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();
  const { currentBuId } = useBu();

  return useMutation({
    mutationFn: async (input: CreateTeamKrBundleInput): Promise<CreateTeamKrBundleResult> => {
      if (!supabase || !currentBuId) {
        throw new Error('Cliente não disponível');
      }

      const krIds: string[] = [];
      const dependencyIds: string[] = [];
      const initiativeIds: string[] = [];

      // 1. Create key results
      for (const kr of input.keyResults) {
        const { data: krData, error: krError } = await supabase
          .from('okr_team_key_results')
          .insert({
            bu_id: currentBuId,
            team_id: input.teamId,
            team_objective_id: input.objectiveId,
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

      // 2. Create dependencies
      if (input.dependencies && input.dependencies.length > 0) {
        for (const dep of input.dependencies) {
          const krId = krIds[dep.kr_index];
          if (!krId) continue;

          // Constraint: precisa de team OU kr
          if (!dep.depends_on_team_id && !dep.depends_on_kr_id) continue;

          const { data: depData, error: depError } = await supabase
            .from('okr_dependencies')
            .insert({
              kr_id: krId,
              depends_on_team_id: dep.depends_on_team_id || null,
              depends_on_kr_id: dep.depends_on_kr_id || null,
              description: dep.description || null,
              status: 'ok',
            })
            .select('id')
            .single();

          if (depError) {
            console.error('Error creating dependency:', depError);
            // Non-blocking: continue with other deps
          } else {
            dependencyIds.push(depData.id);
          }
        }
      }

      // 3. Create initiatives
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
        krIds,
        dependencyIds,
        initiativeIds,
      };
    },
    onSuccess: (_, variables) => {
      // Use prefix helpers for broad invalidation
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.initiativesAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectiveDetail(variables.objectiveId) });
      queryClient.invalidateQueries({ queryKey: ['cross-dependencies'] });
      
      toast.success('Key Results criados com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating team KR bundle:', error);
      toast.error('Erro ao criar Key Results');
    },
  });
}
