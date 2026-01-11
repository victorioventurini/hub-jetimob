/**
 * useKrWizardDraft - Hook para persistir estado do wizard de criação de KRs
 * 
 * Persiste o draft no localStorage para acesso imediato offline
 * e no banco de dados para persistência entre sessões
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import type { OkrKrType, OkrDirection, DraftTeamKr, DraftTeamDependency, DraftTeamInitiative } from '../types/wizard';
import type { KrPlan } from '../components/wizards/team-okr-creation/TeamOkrKrTypeStep';

// ============================================================
// TYPES
// ============================================================

export type KrWizardStep = 
  | 'kr-context' 
  | 'kr-alignment' 
  | 'kr-type' 
  | 'kr-detail' 
  | 'kr-shared-check' 
  | 'kr-dependencies' 
  | 'kr-initiatives' 
  | 'kr-review';

export interface TeamKrDraft {
  version: number;
  createdAt: string;
  updatedAt: string;
  
  // Context
  objectiveId: string;
  teamId: string;
  cycleId: string | null;
  
  // Navigation
  currentStep: KrWizardStep;
  
  // Step 2 - Alignment
  strategicReflection: string;
  
  // Step 3/4 - KRs
  krPlan: KrPlan;
  draftKrs: DraftTeamKr[];
  
  // Step 6 - Dependencies
  dependencies: DraftTeamDependency[];
  
  // Step 7 - Initiatives
  initiatives: DraftTeamInitiative[];
}

export interface UseKrWizardDraftOptions {
  objectiveId: string;
  enabled?: boolean;
}

export interface UseKrWizardDraftReturn {
  draft: TeamKrDraft | null;
  updateDraft: (updates: Partial<TeamKrDraft>) => void;
  setStep: (step: KrWizardStep) => void;
  clearDraft: () => void;
  discardDraft: () => void;
  saveDraft: () => Promise<void>;
  isDirty: boolean;
  isSaving: boolean;
  isResumingDraft: boolean;
  hasSavedDraft: boolean;
  lastSavedAt: string | null;
}

// ============================================================
// CONSTANTS
// ============================================================

const DRAFT_VERSION = 1;
const STORAGE_KEY_PREFIX = 'okr-draft.team-kr-creation';

function getStorageKey(objectiveId: string): string {
  return `${STORAGE_KEY_PREFIX}.${objectiveId}`;
}

function createEmptyDraft(objectiveId: string, teamId: string, cycleId: string | null): TeamKrDraft {
  const now = new Date().toISOString();
  return {
    version: DRAFT_VERSION,
    createdAt: now,
    updatedAt: now,
    objectiveId,
    teamId,
    cycleId,
    currentStep: 'kr-context',
    strategicReflection: '',
    krPlan: {
      foundational: 1,
      contribution: 0,
      enabler: 0,
    },
    draftKrs: [],
    dependencies: [],
    initiatives: [],
  };
}

// ============================================================
// HOOK
// ============================================================

export function useKrWizardDraft(options: UseKrWizardDraftOptions): UseKrWizardDraftReturn {
  const { objectiveId, enabled = true } = options;
  const queryClient = useQueryClient();
  const { client: supabase } = useOptionalBuClient();
  const { currentBuId } = useBu();
  const { user } = useAuth();

  // State
  const [draft, setDraft] = useState<TeamKrDraft | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isResumingDraft, setIsResumingDraft] = useState(true);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const hasLoadedFromDb = useRef(false);

  // Storage key
  const storageKey = getStorageKey(objectiveId);

  // ── Query for existing session ──
  const { data: existingSession, isLoading: isLoadingSession } = useQuery({
    queryKey: queryKeys.okrs.wizardDraftGeneric(user?.id ?? '', `team-kr-creation.${objectiveId}`),
    queryFn: async () => {
      if (!supabase || !currentBuId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .select('id, draft_data, created_at, updated_at')
        .eq('bu_id', currentBuId)
        .eq('user_id', user.id)
        .eq('wizard_type', 'team-kr-creation')
        .eq('objective_id', objectiveId)
        .is('completed_at', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading KR wizard session:', error);
        return null;
      }
      return data;
    },
    enabled: enabled && !!supabase && !!currentBuId && !!user?.id && !!objectiveId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Debounced localStorage persistence ──
  const persistToStorage = useDebouncedCallback((draftToSave: TeamKrDraft) => {
    if (!objectiveId) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draftToSave));
    } catch (e) {
      console.error('Failed to persist KR draft to localStorage:', e);
    }
  }, 500);

  // ── Mutation for saving to DB ──
  const saveMutation = useMutation({
    mutationFn: async (draftToSave: TeamKrDraft) => {
      if (!supabase || !currentBuId || !user?.id) {
        throw new Error('Client not available');
      }

      const sessionData = {
        bu_id: currentBuId,
        user_id: user.id,
        wizard_type: 'team-kr-creation',
        objective_id: objectiveId,
        team_id: draftToSave.teamId,
        draft_data: draftToSave as any,
        updated_at: new Date().toISOString(),
      };

      if (sessionId) {
        // Update existing session
        const { error } = await supabase
          .from('okr_wizard_sessions')
          .update(sessionData)
          .eq('id', sessionId);
        if (error) throw error;
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('okr_wizard_sessions')
          .insert(sessionData)
          .select('id')
          .single();
        if (error) throw error;
        setSessionId(data.id);
      }
    },
    onSuccess: () => {
      setLastSavedAt(new Date().toISOString());
      setIsDirty(false);
    },
    onError: (error) => {
      console.error('Failed to save KR draft to DB:', error);
    },
  });

  // ── Initialize draft ──
  useEffect(() => {
    if (!enabled || !objectiveId || initializedFor === objectiveId) return;
    if (isLoadingSession) return;

    setIsResumingDraft(true);

    // Try localStorage first
    const savedLocal = localStorage.getItem(storageKey);
    let localDraft: TeamKrDraft | null = null;

    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed.version === DRAFT_VERSION && parsed.objectiveId === objectiveId) {
          localDraft = parsed;
        }
      } catch (e) {
        console.error('Failed to parse local KR draft:', e);
      }
    }

    // Prefer DB session if newer
    if (existingSession && !hasLoadedFromDb.current) {
      const dbDraft = existingSession.draft_data as TeamKrDraft;
      const dbUpdated = new Date(existingSession.updated_at);
      const localUpdated = localDraft ? new Date(localDraft.updatedAt) : new Date(0);

      if (dbUpdated >= localUpdated) {
        setDraft(dbDraft);
        setSessionId(existingSession.id);
        setLastSavedAt(existingSession.updated_at);
        hasLoadedFromDb.current = true;
        setIsResumingDraft(false);
        setInitializedFor(objectiveId);
        return;
      }
    }

    // Use local draft or create new
    if (localDraft) {
      setDraft(localDraft);
    }

    setIsResumingDraft(false);
    setInitializedFor(objectiveId);
  }, [enabled, objectiveId, storageKey, existingSession, isLoadingSession, initializedFor]);

  // ── Persist to localStorage when draft changes ──
  useEffect(() => {
    if (draft && isDirty) {
      persistToStorage(draft);
    }
  }, [draft, isDirty, persistToStorage]);

  // ── API ──
  const updateDraft = useCallback((updates: Partial<TeamKrDraft>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    setIsDirty(true);
  }, []);

  const setStep = useCallback((step: KrWizardStep) => {
    updateDraft({ currentStep: step });
  }, [updateDraft]);

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    await saveMutation.mutateAsync(draft);
  }, [draft, saveMutation]);

  const clearDraft = useCallback(() => {
    // Clear both localStorage and DB session
    localStorage.removeItem(storageKey);
    
    if (sessionId && supabase) {
      supabase
        .from('okr_wizard_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionId)
        .then(() => {
          queryClient.invalidateQueries({ 
            queryKey: queryKeys.okrs.wizardDraftGeneric(user?.id ?? '', `team-kr-creation.${objectiveId}`) 
          });
        });
    }

    setDraft(null);
    setSessionId(null);
    setIsDirty(false);
    setInitializedFor(null);
    hasLoadedFromDb.current = false;
  }, [storageKey, sessionId, supabase, queryClient, user?.id, objectiveId]);

  const discardDraft = useCallback(() => {
    // Mark session as discarded if exists
    localStorage.removeItem(storageKey);
    
    if (sessionId && supabase) {
      supabase
        .from('okr_wizard_sessions')
        .delete()
        .eq('id', sessionId)
        .then(() => {
          queryClient.invalidateQueries({ 
            queryKey: queryKeys.okrs.wizardDraftGeneric(user?.id ?? '', `team-kr-creation.${objectiveId}`) 
          });
        });
    }

    setDraft(null);
    setSessionId(null);
    setIsDirty(false);
    setInitializedFor(null);
    hasLoadedFromDb.current = false;
  }, [storageKey, sessionId, supabase, queryClient, user?.id, objectiveId]);

  // ── Initialize empty draft for objective ──
  const initializeDraft = useCallback((teamId: string, cycleId: string | null) => {
    if (!draft && objectiveId) {
      const newDraft = createEmptyDraft(objectiveId, teamId, cycleId);
      setDraft(newDraft);
    }
  }, [draft, objectiveId]);

  return {
    draft,
    updateDraft,
    setStep,
    clearDraft,
    discardDraft,
    saveDraft,
    isDirty,
    isSaving: saveMutation.isPending,
    isResumingDraft,
    hasSavedDraft: !!existingSession || !!draft,
    lastSavedAt,
    initializeDraft,
  } as UseKrWizardDraftReturn & { initializeDraft: (teamId: string, cycleId: string | null) => void };
}
