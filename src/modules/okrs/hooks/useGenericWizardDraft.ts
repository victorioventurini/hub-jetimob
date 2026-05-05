/**
 * useGenericWizardDraft — Hook genérico para persistência de rascunhos de wizard
 *
 * Orquestra:
 *  1. localStorage (imediato, offline-first) — `useGenericWizardDraft.storage.ts`
 *  2. okr_wizard_sessions (sync explícito) — `useGenericWizardDraft.session.ts`
 *  3. Auto-associação a ritual_occurrences ao concluir — `useGenericWizardDraft.occurrence.ts`
 *
 * 1 rascunho global por usuário por tipo de wizard.
 *
 * Refatoração P1: hook foi quebrado em sub-módulos focados para
 * ficar dentro do limite de tamanho do Standard §M.1, sem alterar
 * o contrato público (mesmas opções e mesmo retorno).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import {
  DRAFT_VERSION,
  type GenericWizardDraft,
  type UseGenericWizardDraftOptions,
  type UseGenericWizardDraftReturn,
} from './useGenericWizardDraft.types';
import {
  getDraftKey,
  readDraftFromStorage,
  hasLocalDraft,
  writeDraftToStorage,
  clearDraftFromStorage,
} from './useGenericWizardDraft.storage';
import { useWizardSessionStorage } from './useGenericWizardDraft.session';

// Re-export public types for downstream consumers
export type {
  GenericWizardDraft,
  UseGenericWizardDraftOptions,
  UseGenericWizardDraftReturn,
} from './useGenericWizardDraft.types';

export function useGenericWizardDraft<TStep extends string, TData>({
  wizardType,
  teamId = null,
  cycleId = null,
  defaultStep,
  defaultData,
  enabled = true,
}: UseGenericWizardDraftOptions<TStep, TData>): UseGenericWizardDraftReturn<TStep, TData> {
  const storageKey = getDraftKey(wizardType, teamId);

  // Local state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isResumingDraft, setIsResumingDraft] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isCompletingRef = useRef(false);
  const hasHydratedStorageRef = useRef(false);
  const isInitialMount = useRef(true);

  // Session sub-hook (handles all DB interactions)
  const {
    existingSessionData,
    saveSession,
    abandonSession,
    completeSession,
    reopenSession: reopenSessionInDb,
    isSaving,
    invalidateDraftQuery,
  } = useWizardSessionStorage<TStep, TData>({
    wizardType,
    teamId,
    cycleId,
    enabled,
  });

  // Empty draft factory
  const createEmptyDraft = useCallback(
    (): GenericWizardDraft<TStep, TData> => ({
      version: DRAFT_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wizardType,
      teamId,
      cycleId,
      currentStep: defaultStep,
      data: defaultData,
    }),
    [wizardType, teamId, cycleId, defaultStep, defaultData],
  );

  // Initialize from localStorage
  const [draft, setDraft] = useState<GenericWizardDraft<TStep, TData>>(() => {
    if (!enabled) return createEmptyDraft();
    return (
      readDraftFromStorage<TStep, TData>(storageKey, wizardType) ?? createEmptyDraft()
    );
  });

  const [hasSavedDraft] = useState(() => hasLocalDraft(storageKey, wizardType));

  // Hydrate from localStorage when enabled becomes true (refresh before cycle load)
  useEffect(() => {
    if (!enabled || hasHydratedStorageRef.current) return;
    hasHydratedStorageRef.current = true;

    const parsed = readDraftFromStorage<TStep, TData>(storageKey, wizardType);
    if (parsed) {
      setDraft(parsed);
      setIsResumingDraft(parsed.currentStep !== defaultStep);
    }
  }, [enabled, storageKey, wizardType, defaultStep]);

  // Load from DB if localStorage is empty but DB has data
  useEffect(() => {
    if (!existingSessionData) return;
    if (hasLocalDraft(storageKey, wizardType)) return;

    const dbData = existingSessionData.reflection_data as unknown;
    if (dbData && typeof dbData === 'object' && 'version' in dbData) {
      const parsed = dbData as GenericWizardDraft<TStep, TData>;
      if (parsed.version === DRAFT_VERSION && parsed.wizardType === wizardType) {
        setDraft(parsed);
        setSessionId(existingSessionData.id);
        setLastSavedAt(existingSessionData.updated_at);
        setIsResumingDraft(true);
      }
    }
  }, [existingSessionData, storageKey, wizardType]);

  // Detect resuming from localStorage on mount
  useEffect(() => {
    if (draft.createdAt && draft.currentStep !== defaultStep) {
      setIsResumingDraft(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync step FROM URL on mount (URL takes priority if present)
  useEffect(() => {
    const urlStep = new URLSearchParams(window.location.search).get('step');
    if (urlStep && urlStep !== draft.currentStep) {
      setDraft((prev) => ({ ...prev, currentStep: urlStep as TStep }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage with debounce
  const persistToStorage = useDebouncedCallback(
    (draftToSave: GenericWizardDraft<TStep, TData>) => {
      if (!enabled) return;
      writeDraftToStorage(storageKey, draftToSave);
    },
    500,
  );

  // Persist immediately (critical actions: refresh/save)
  const persistToStorageNow = useCallback(
    (draftToSave: GenericWizardDraft<TStep, TData>) => {
      if (!enabled) return;
      writeDraftToStorage(storageKey, draftToSave);
    },
    [enabled, storageKey],
  );

  // Update draft data
  const updateDraft = useCallback(
    (updates: Partial<TData>) => {
      setDraft((prev) => {
        const nextDraft = { ...prev, data: { ...prev.data, ...updates } };
        persistToStorageNow(nextDraft);
        return nextDraft;
      });
      setIsDirty(true);
    },
    [persistToStorageNow],
  );

  // Set step — sync with URL ?step= via replaceState (no history entries)
  const setStep = useCallback(
    (step: TStep) => {
      setDraft((prev) => {
        const nextDraft = { ...prev, currentStep: step };
        persistToStorageNow(nextDraft);
        return nextDraft;
      });
      setIsDirty(true);
      const url = new URL(window.location.href);
      if (step === defaultStep) {
        url.searchParams.delete('step');
      } else {
        url.searchParams.set('step', step);
      }
      window.history.replaceState(window.history.state, '', url.toString());
    },
    [defaultStep, persistToStorageNow],
  );

  // Save draft explicitly (localStorage + DB)
  const saveDraft = useCallback(async (): Promise<string | null> => {
    persistToStorageNow(draft);
    const newSessionId = await saveSession(sessionId, draft);
    setSessionId(newSessionId);
    setLastSavedAt(new Date().toISOString());
    setIsDirty(false);
    return newSessionId;
  }, [saveSession, sessionId, draft, persistToStorageNow]);

  // Discard draft and start fresh
  const discardDraft = useCallback(async () => {
    clearDraftFromStorage(storageKey);
    if (sessionId) {
      await abandonSession(sessionId);
    }

    setDraft(createEmptyDraft());
    setSessionId(null);
    setLastSavedAt(null);
    setIsDirty(false);
    setIsResumingDraft(false);

    const url = new URL(window.location.href);
    url.searchParams.delete('step');
    window.history.replaceState(window.history.state, '', url.toString());

    invalidateDraftQuery();
  }, [
    storageKey,
    sessionId,
    abandonSession,
    createEmptyDraft,
    invalidateDraftQuery,
  ]);

  // Clear draft (after successful completion)
  // Returns the sessionId (existing or newly created) for post-completion actions
  const clearDraft = useCallback(async (): Promise<string | null> => {
    if (isCompletingRef.current) {
      console.warn('[useGenericWizardDraft] clearDraft already in progress, skipping duplicate call');
      return null;
    }
    isCompletingRef.current = true;

    clearDraftFromStorage(storageKey);

    const resultId = await completeSession(sessionId, draft);

    setDraft(createEmptyDraft());
    setSessionId(null);
    setLastSavedAt(null);
    setIsDirty(false);
    setIsResumingDraft(false);

    const url = new URL(window.location.href);
    url.searchParams.delete('step');
    window.history.replaceState(window.history.state, '', url.toString());

    // Note: do NOT reset isCompletingRef — once completed, prevent any further calls
    return resultId;
  }, [storageKey, sessionId, completeSession, draft, createEmptyDraft]);

  // Reopen completed session
  const reopenSession = useCallback(
    async (completedSessionId: string): Promise<boolean> => {
      const hydratedDraft = await reopenSessionInDb(completedSessionId);
      if (!hydratedDraft) return false;

      writeDraftToStorage(storageKey, hydratedDraft);
      setDraft(hydratedDraft);
      setSessionId(completedSessionId);
      setIsDirty(false);
      setIsResumingDraft(true);
      return true;
    },
    [reopenSessionInDb, storageKey],
  );

  // Persist changes to localStorage (debounced)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isDirty && enabled) {
      persistToStorage(draft);
    }
  }, [draft, isDirty, enabled, persistToStorage]);

  // Flush latest draft on browser refresh/close to avoid losing recent typing
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (isDirty) {
        persistToStorageNow(draft);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, isDirty, draft, persistToStorageNow]);

  // Update teamId/cycleId in draft when they change
  useEffect(() => {
    if (draft.teamId !== teamId || draft.cycleId !== cycleId) {
      setDraft((prev) => ({ ...prev, teamId, cycleId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, cycleId]);

  return {
    draft,
    updateDraft,
    setStep,
    clearDraft,
    discardDraft,
    saveDraft,
    reopenSession,
    isDirty,
    isSaving,
    isResumingDraft,
    hasSavedDraft: hasSavedDraft || !!existingSessionData,
    lastSavedAt,
    sessionId,
  };
}
