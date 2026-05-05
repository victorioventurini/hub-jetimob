/**
 * useGenericWizardDraft — Sub-hook de sessão (DB)
 *
 * Encapsula todas as operações que tocam `okr_wizard_sessions`:
 * - fetch de sessão in_progress existente
 * - save (insert/update reutilizando sessão para evitar duplicatas)
 * - discard (marca abandoned)
 * - complete (marca completed + associa a ritual_occurrence)
 * - reopen (volta para in_progress + backup em addendums)
 *
 * Extraído do hook monolítico (refatoração P1).
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useAuth } from '@/hooks/useAuth';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import type { WizardPersona } from '@/modules/okrs/types/wizard';
import { getCurrentStructureVersion } from '@/modules/okrs/components/wizards/shared/framework/config/structureVersions';
import {
  DRAFT_VERSION,
  type GenericWizardDraft,
} from './useGenericWizardDraft.types';
import { associateCompletedSessionToOccurrence } from './useGenericWizardDraft.occurrence';

export interface UseWizardSessionStorageOptions {
  wizardType: WizardPersona;
  teamId: string | null;
  cycleId: string | null;
  enabled: boolean;
}

export interface UseWizardSessionStorageReturn<TStep extends string, TData> {
  existingSessionData: { id: string; reflection_data: unknown; updated_at: string } | null | undefined;
  saveSession: (
    sessionId: string | null,
    draft: GenericWizardDraft<TStep, TData>,
  ) => Promise<string>;
  abandonSession: (sessionId: string) => Promise<void>;
  completeSession: (
    sessionId: string | null,
    draft: GenericWizardDraft<TStep, TData>,
  ) => Promise<string | null>;
  reopenSession: (
    completedSessionId: string,
  ) => Promise<GenericWizardDraft<TStep, TData> | null>;
  isSaving: boolean;
  invalidateDraftQuery: () => void;
}

export function useWizardSessionStorage<TStep extends string, TData>({
  wizardType,
  teamId,
  cycleId,
  enabled,
}: UseWizardSessionStorageOptions): UseWizardSessionStorageReturn<TStep, TData> {
  const { profile } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const buSupabase = useBuScopedSupabase();

  const draftQueryKey = queryKeys.okrs.wizardDraftGeneric(profile?.id || '', wizardType, teamId);

  const invalidateDraftQuery = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: draftQueryKey });
  }, [queryClient, draftQueryKey]);

  // Fetch existing in-progress session
  const existingSessionQuery = useQuery({
    queryKey: draftQueryKey,
    queryFn: async () => {
      if (!profile?.id) return null;

      let query = buSupabase
        .from('okr_wizard_sessions')
        .select('id, team_id, cycle_id, reflection_data, updated_at')
        .eq('started_by', profile.id)
        .eq('wizard_type', wizardType)
        .eq('status', 'in_progress');

      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        query = query.is('team_id', null);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && enabled,
  });

  // Save mutation — insert/update with anti-duplicate guard
  const saveDraftMutation = useMutation({
    mutationFn: async ({
      sessionId,
      draftToSave,
    }: {
      sessionId: string | null;
      draftToSave: GenericWizardDraft<TStep, TData>;
    }): Promise<string> => {
      if (!profile?.id || !currentBu?.id) {
        throw new Error('User or BU not available');
      }

      const reflectionData = JSON.parse(
        JSON.stringify({ ...draftToSave, updatedAt: new Date().toISOString() }),
      );

      if (sessionId) {
        const { error } = await buSupabase
          .from('okr_wizard_sessions')
          .update({
            reflection_data: reflectionData,
            team_id: draftToSave.teamId,
            cycle_id: draftToSave.cycleId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (error) throw error;
        return sessionId;
      }

      // No session yet — check for existing in_progress to reuse
      let existingQuery = buSupabase
        .from('okr_wizard_sessions')
        .select('id')
        .eq('started_by', profile.id)
        .eq('wizard_type', wizardType)
        .eq('status', 'in_progress');

      if (draftToSave.teamId) {
        existingQuery = existingQuery.eq('team_id', draftToSave.teamId);
      } else {
        existingQuery = existingQuery.is('team_id', null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        const { error: updateError } = await buSupabase
          .from('okr_wizard_sessions')
          .update({
            reflection_data: reflectionData,
            team_id: draftToSave.teamId,
            cycle_id: draftToSave.cycleId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        return existing.id;
      }

      // Create new session
      const { data, error } = await buSupabase
        .from('okr_wizard_sessions')
        .insert([
          {
            bu_id: currentBu.id,
            wizard_type: wizardType,
            team_id: draftToSave.teamId,
            cycle_id: draftToSave.cycleId,
            started_by: profile.id,
            reflection_data: reflectionData,
            structure_version: getCurrentStructureVersion(wizardType),
          },
        ])
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      invalidateDraftQuery();
    },
  });

  const saveSession = useCallback(
    async (sessionId: string | null, draftToSave: GenericWizardDraft<TStep, TData>) =>
      saveDraftMutation.mutateAsync({ sessionId, draftToSave }),
    [saveDraftMutation],
  );

  const abandonSession = useCallback(
    async (sessionId: string) => {
      try {
        await buSupabase
          .from('okr_wizard_sessions')
          .update({ status: 'abandoned' })
          .eq('id', sessionId);
      } catch (e) {
        console.error('Failed to abandon wizard session:', e);
      }
    },
    [buSupabase],
  );

  const completeSession = useCallback(
    async (
      sessionId: string | null,
      draft: GenericWizardDraft<TStep, TData>,
    ): Promise<string | null> => {
      const completionDateIso = new Date().toISOString();

      if (sessionId) {
        // CRÍTICO: gravar `reflection_data` no momento de concluir.
        // Sem isso, qualquer edit feito após o último auto-save (debounced)
        // — tipicamente no step Resumo — fica perdido. O draft passado é
        // sempre o estado React mais recente do wizard.
        const reflectionData = JSON.parse(
          JSON.stringify({ ...draft, updatedAt: completionDateIso }),
        );
        const { data: updated, error } = await buSupabase
          .from('okr_wizard_sessions')
          .update({
            status: 'completed',
            completed_at: completionDateIso,
            reflection_data: reflectionData,
            team_id: draft.teamId,
            cycle_id: draft.cycleId,
            updated_at: completionDateIso,
          })
          .eq('id', sessionId)
          .select('id')
          .maybeSingle();

        if (error) {
          console.error('[completeSession] Failed to complete wizard session:', error);
          throw error;
        }
        if (!updated) {
          const notFound = new Error(
            `[completeSession] Session ${sessionId} not found or not updatable (RLS?)`,
          );
          console.error(notFound.message);
          throw notFound;
        }

        // Best-effort: occurrence association is non-critical
        if (currentBu?.id) {
          try {
            await associateCompletedSessionToOccurrence({
              supabase: buSupabase,
              sessionId,
              wizardType,
              buId: currentBu.id,
              teamId,
              completionDateIso,
            });
          } catch (e) {
            console.warn('[completeSession] occurrence association failed (non-blocking):', e);
          }
        }
        return sessionId;
      }

      if (!profile?.id || !currentBu?.id) {
        throw new Error('[completeSession] Missing profile or BU context');
      }

      const reflectionData = JSON.parse(JSON.stringify(draft));
      const { data: inserted, error } = await buSupabase
        .from('okr_wizard_sessions')
        .insert([
          {
            bu_id: currentBu.id,
            wizard_type: wizardType,
            team_id: teamId,
            cycle_id: cycleId,
            started_by: profile.id,
            status: 'completed' as const,
            completed_at: completionDateIso,
            reflection_data: reflectionData,
            structure_version: getCurrentStructureVersion(wizardType),
          },
        ])
        .select('id')
        .single();

      if (error || !inserted) {
        console.error('[completeSession] Failed to create completed wizard session:', error);
        throw error ?? new Error('[completeSession] Insert returned no row');
      }

      try {
        await associateCompletedSessionToOccurrence({
          supabase: buSupabase,
          sessionId: inserted.id,
          wizardType,
          buId: currentBu.id,
          teamId,
          completionDateIso,
        });
      } catch (e) {
        console.warn('[completeSession] occurrence association failed (non-blocking):', e);
      }

      return inserted.id;
    },
    [buSupabase, currentBu?.id, profile?.id, wizardType, teamId, cycleId],
  );

  const reopenSession = useCallback(
    async (completedSessionId: string): Promise<GenericWizardDraft<TStep, TData> | null> => {
      try {
        const { data: session, error: fetchError } = await buSupabase
          .from('okr_wizard_sessions')
          .select('id, reflection_data, addendums')
          .eq('id', completedSessionId)
          .eq('status', 'completed')
          .single();

        if (fetchError || !session) {
          console.error('[reopenSession] Failed to fetch session:', fetchError);
          return null;
        }

        const reflectionData = session.reflection_data as unknown as
          | GenericWizardDraft<TStep, TData>
          | null;
        if (
          !reflectionData ||
          typeof reflectionData !== 'object' ||
          !('data' in reflectionData)
        ) {
          console.error('[reopenSession] Incompatible reflection_data format');
          return null;
        }

        // Backup snapshot
        const existingAddendums = Array.isArray(session.addendums) ? session.addendums : [];
        const backupEntry = {
          type: 'pre_reopen_backup',
          snapshot: session.reflection_data,
          created_at: new Date().toISOString(),
        };
        const updatedAddendums = [...existingAddendums, backupEntry];

        const { error: updateError } = await buSupabase
          .from('okr_wizard_sessions')
          .update({
            status: 'in_progress',
            completed_at: null,
            addendums: updatedAddendums,
          })
          .eq('id', completedSessionId);

        if (updateError) {
          console.error('[reopenSession] Failed to revert session status:', updateError);
          return null;
        }

        const hydratedDraft: GenericWizardDraft<TStep, TData> = {
          ...reflectionData,
          version: DRAFT_VERSION,
          updatedAt: new Date().toISOString(),
        };

        invalidateDraftQuery();
        if (profile?.id && cycleId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.okrs.completedSessionForCycle(
              wizardType,
              teamId,
              cycleId,
              profile.id,
            ),
          });
        }

        return hydratedDraft;
      } catch (err) {
        console.error('[reopenSession] Unexpected error:', err);
        return null;
      }
    },
    [buSupabase, queryClient, profile?.id, wizardType, teamId, cycleId, invalidateDraftQuery],
  );

  return {
    existingSessionData: existingSessionQuery.data,
    saveSession,
    abandonSession,
    completeSession,
    reopenSession,
    isSaving: saveDraftMutation.isPending,
    invalidateDraftQuery,
  };
}
