/**
 * useCreateCheckin - Hook reutilizável para criar check-ins
 * 
 * Extrai a lógica de criação do CheckinDialog para reuso no Wizard
 * 
 * IDENTITY: Usa profile_id (nunca auth.uid())
 * NOTIFICATIONS: Emite mention.created via emit_notification_event
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { useIdentity } from '@/hooks/useIdentity';
import { useAuth } from '@/hooks/useAuth';
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
  const { currentBuId } = useBu();
  const { profileId } = useIdentity();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get author name for notifications
  const getAuthorName = async (): Promise<string> => {
    if (!user?.id) return 'Alguém';
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    return data?.display_name || 'Alguém';
  };

  // Process mentions and emit notifications
  const processMentions = async (
    text: string,
    checkinId: string,
    krId: string,
    authorName: string
  ) => {
    if (!currentBuId || !user?.id) return;

    // Extract user IDs from mention format: @[Name](user_id)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]);
    }

    const uniqueMentions = [...new Set(mentions)];
    if (uniqueMentions.length === 0) return;

    for (const mentionedUserId of uniqueMentions) {
      try {
        await supabase.rpc('emit_notification_event', {
          p_event_slug: 'mention.created',
          p_bu_id: currentBuId,
          p_recipient_user_ids: [mentionedUserId],
          p_actor_id: user.id,
          p_title: `${authorName} mencionou você`,
          p_message: 'Você foi mencionado em um check-in',
          p_context_type: 'checkin',
          p_context_id: checkinId,
          p_context_url: `/okrs?kr=${krId}`,
          p_metadata: {
            parent_type: 'kr',
            parent_id: krId,
            author_name: authorName,
          },
        });
      } catch (error) {
        console.error('Failed to create mention notification:', error);
      }
    }
  };

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

      // Process mentions if comments exist
      if (input.comments) {
        const authorName = await getAuthorName();
        await processMentions(input.comments, checkinData.id, input.krId, authorName);
      }

      return checkinData.id;
    },
    onSuccess: (checkinId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResults(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.pendingCheckins(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.checkinSummary(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.wizardTeamKrs(null, null, [], 'all') });

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
