/**
 * useCreateCheckin - Hook reutilizável para criar check-ins
 * 
 * Extrai a lógica de criação do CheckinDialog para reuso no Wizard
 * 
 * IDENTITY: Usa profile_id (nunca auth.uid())
 * COMENTÁRIO: Texto livre — sem processamento de menções neste fluxo.
 *   (Menções @ continuam funcionando no CheckinDialog do drawer /okrs.)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useIdentity } from '@/hooks/useIdentity';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from '@/hooks/use-toast';

// ============================================================
// TYPES
// ============================================================

export type CheckinConfidence = 'high' | 'medium' | 'low';
export type CheckinStatus = 'green' | 'yellow' | 'red';

export interface CreateCheckinInput {
  krId: string;
  currentValue: number;
  previousValue: number;
  confidence: CheckinConfidence;
  comments?: string;
  blockers?: string;
  teamId?: string | null;
}

export interface CreateCheckinOptions {
  onSuccess?: (checkinId: string) => void;
  onError?: (error: Error) => void;
  skipToast?: boolean;
}

// ============================================================
// HOOK
// ============================================================

export function useCreateCheckin(options: CreateCheckinOptions = {}) {
  const supabase = useBuScopedSupabase();
  const { profileId } = useIdentity();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateCheckinInput): Promise<string> => {
      if (!profileId) throw new Error('Perfil não encontrado');

      // Create check-in
      const { data: checkinData, error } = await supabase
        .from('okr_checkins')
        .insert({
          kr_id: input.krId,
          current_value: input.currentValue,
          previous_value: input.previousValue,
          confidence: input.confidence,
          comments: input.comments || null,
          blockers: input.blockers || null,
          user_id: profileId, // PROFILE_ID: Conforme IDENTITY_CONVENTION.md
          team_id: input.teamId || null,
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      // Update KR status and current_value
      const statusMap: Record<CheckinConfidence, CheckinStatus> = {
        high: 'green',
        medium: 'yellow',
        low: 'red',
      };

      const { error: updateError } = await supabase
        .from('okr_team_key_results')
        .update({
          status: statusMap[input.confidence],
          current_value: input.currentValue,
        })
        .eq('id', input.krId);

      if (updateError) throw updateError;

      // Comentário é persistido como texto livre em okr_checkins.comments.
      // Sem processamento de @menções neste fluxo (Check-in Individual).
      return checkinData.id;
    },
    onSuccess: (checkinId) => {
      // Use prefix helpers for broad invalidation with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.pendingCheckins(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.checkinSummary(null), refetchType: 'active' });

      if (!options.skipToast) {
        toast({
          title: '✓ Check-in registrado',
          description: 'O progresso foi atualizado com sucesso.',
        });
      }

      options.onSuccess?.(checkinId);
    },
    onError: (error: Error) => {
      if (!options.skipToast) {
        toast({
          title: 'Erro ao registrar check-in',
          description: error.message,
          variant: 'destructive',
        });
      }
      options.onError?.(error);
    },
  });

  return mutation;
}

// ============================================================
// HELPER: Map status to confidence
// ============================================================

export function statusToConfidence(status: CheckinStatus): CheckinConfidence {
  const map: Record<CheckinStatus, CheckinConfidence> = {
    green: 'high',
    yellow: 'medium',
    red: 'low',
  };
  return map[status];
}

export function confidenceToStatus(confidence: CheckinConfidence): CheckinStatus {
  const map: Record<CheckinConfidence, CheckinStatus> = {
    high: 'green',
    medium: 'yellow',
    low: 'red',
  };
  return map[confidence];
}
