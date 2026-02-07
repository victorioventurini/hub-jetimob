/**
 * useGenericWizardDraft - Hook genérico para persistência de rascunhos de wizard
 * 
 * Funciona para qualquer tipo de wizard de OKR, com:
 * 1. localStorage (imediato, offline-first)
 * 2. okr_wizard_sessions (sync explícito ao clicar "Salvar rascunho")
 * 
 * 1 rascunho global por usuário por tipo de wizard.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useAuth } from '@/hooks/useAuth';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface GenericWizardDraft<TStep extends string, TData> {
  version: number;
  createdAt: string;
  updatedAt: string;
  wizardType: WizardPersona;
  teamId: string | null;
  cycleId: string | null;
  currentStep: TStep;
  data: TData;
}

export interface UseGenericWizardDraftOptions<TStep extends string, TData> {
  wizardType: WizardPersona;
  teamId?: string | null;
  cycleId?: string | null;
  defaultStep: TStep;
  defaultData: TData;
  enabled?: boolean;
}

export interface UseGenericWizardDraftReturn<TStep extends string, TData> {
  draft: GenericWizardDraft<TStep, TData>;
  updateDraft: (updates: Partial<TData>) => void;
  setStep: (step: TStep) => void;
  clearDraft: () => Promise<void>;
  discardDraft: () => Promise<void>;
  saveDraft: () => Promise<void>;
  isDirty: boolean;
  isSaving: boolean;
  isResumingDraft: boolean;
  hasSavedDraft: boolean;
  lastSavedAt: string | null;
  sessionId: string | null;
}

const DRAFT_VERSION = 1;

// ============================================================
// STORAGE KEY HELPER
// ============================================================

function getDraftKey(wizardType: WizardPersona): string {
  return `okr-draft.${wizardType}`;
}

// ============================================================
// HOOK
// ============================================================

export function useGenericWizardDraft<TStep extends string, TData>({
  wizardType,
  teamId = null,
  cycleId = null,
  defaultStep,
  defaultData,
  enabled = true,
}: UseGenericWizardDraftOptions<TStep, TData>): UseGenericWizardDraftReturn<TStep, TData> {
  const { profile } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const buSupabase = useBuScopedSupabase();
  
  const storageKey = getDraftKey(wizardType);
  
  // Session ID for database sync
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isResumingDraft, setIsResumingDraft] = useState(false);
  
  // Create empty draft
  const createEmptyDraft = useCallback((): GenericWizardDraft<TStep, TData> => ({
    version: DRAFT_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wizardType,
    teamId,
    cycleId,
    currentStep: defaultStep,
    data: defaultData,
  }), [wizardType, teamId, cycleId, defaultStep, defaultData]);
  
  // Check for existing draft session in DB (global per user per wizard type)
  const existingSessionQuery = useQuery({
    queryKey: queryKeys.okrs.wizardDraftGeneric(profile?.id || '', wizardType),
    queryFn: async () => {
      if (!profile?.id) return null;
      
      const { data, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, team_id, cycle_id, reflection_data, updated_at')
        .eq('started_by', profile.id)
        .eq('wizard_type', wizardType)
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && enabled,
  });
  
  // Initialize state from localStorage OR database
  const [draft, setDraft] = useState<GenericWizardDraft<TStep, TData>>(() => {
    if (!enabled) return createEmptyDraft();
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as GenericWizardDraft<TStep, TData>;
        if (parsed.version === DRAFT_VERSION && parsed.wizardType === wizardType) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load wizard draft:', e);
    }
    
    return createEmptyDraft();
  });
  
  // Load from DB if localStorage is empty but DB has data
  useEffect(() => {
    const hasLocalData = (() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.version === DRAFT_VERSION && parsed.wizardType === wizardType;
        }
        return false;
      } catch {
        return false;
      }
    })();
    
    if (existingSessionQuery.data && !hasLocalData) {
      const dbData = existingSessionQuery.data.reflection_data as unknown;
      if (dbData && typeof dbData === 'object' && 'version' in dbData) {
        const parsed = dbData as GenericWizardDraft<TStep, TData>;
        if (parsed.version === DRAFT_VERSION && parsed.wizardType === wizardType) {
          setDraft(parsed);
          setSessionId(existingSessionQuery.data.id);
          setLastSavedAt(existingSessionQuery.data.updated_at);
          setIsResumingDraft(true);
        }
      }
    }
  }, [existingSessionQuery.data, storageKey, wizardType]);
  
  // Check if resuming from localStorage
  useEffect(() => {
    if (draft.createdAt && draft.currentStep !== defaultStep) {
      setIsResumingDraft(true);
    }
  }, []);
  
  const [isDirty, setIsDirty] = useState(false);
  const [hasSavedDraft] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.version === DRAFT_VERSION && parsed.wizardType === wizardType;
      }
      return false;
    } catch {
      return false;
    }
  });
  
  // Track initial load
  const isInitialMount = useRef(true);
  
  // Persist to localStorage with debounce
  const persistToStorage = useDebouncedCallback((draftToSave: GenericWizardDraft<TStep, TData>) => {
    if (!enabled) return;
    
    try {
      const toSave = {
        ...draftToSave,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to persist wizard draft:', e);
    }
  }, 500);
  
  // Save draft to database mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (draftToSave: GenericWizardDraft<TStep, TData>): Promise<string> => {
      if (!profile?.id || !currentBu?.id) {
        throw new Error('User or BU not available');
      }
      
      // Convert to JSON-compatible format
      const reflectionData = JSON.parse(JSON.stringify({
        ...draftToSave,
        updatedAt: new Date().toISOString(),
      }));
      
      if (sessionId) {
        // Update existing session
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
      } else {
        // Create new session
        const { data, error } = await buSupabase
          .from('okr_wizard_sessions')
          .insert([{
            bu_id: currentBu.id,
            wizard_type: wizardType,
            team_id: draftToSave.teamId,
            cycle_id: draftToSave.cycleId,
            started_by: profile.id,
            reflection_data: reflectionData,
          }])
          .select('id')
          .single();
        
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: (newSessionId) => {
      setSessionId(newSessionId);
      setLastSavedAt(new Date().toISOString());
      setIsDirty(false);
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.okrs.wizardDraftGeneric(profile?.id || '', wizardType) 
      });
    },
  });
  
  // Update draft data
  const updateDraft = useCallback((updates: Partial<TData>) => {
    setDraft(prev => ({
      ...prev,
      data: { ...prev.data, ...updates },
    }));
    setIsDirty(true);
  }, []);
  
  // Set step
  const setStep = useCallback((step: TStep) => {
    setDraft(prev => ({ ...prev, currentStep: step }));
    setIsDirty(true);
  }, []);
  
  // Save draft explicitly
  const saveDraft = useCallback(async () => {
    await saveDraftMutation.mutateAsync(draft);
  }, [saveDraftMutation, draft]);
  
  // Discard draft and start fresh
  const discardDraft = useCallback(async () => {
    // Clear localStorage
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error('Failed to clear wizard draft:', e);
    }
    
    // Mark session as abandoned in DB
    if (sessionId) {
      try {
        await buSupabase
          .from('okr_wizard_sessions')
          .update({ status: 'abandoned' })
          .eq('id', sessionId);
      } catch (e) {
        console.error('Failed to abandon wizard session:', e);
      }
    }
    
    setDraft(createEmptyDraft());
    setSessionId(null);
    setLastSavedAt(null);
    setIsDirty(false);
    setIsResumingDraft(false);
    
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.okrs.wizardDraftGeneric(profile?.id || '', wizardType) 
    });
  }, [storageKey, sessionId, profile?.id, wizardType, queryClient, createEmptyDraft]);
  
  // Clear draft (after successful completion)
  const clearDraft = useCallback(async () => {
    // Clear localStorage
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error('Failed to clear wizard draft:', e);
    }
    
    // Mark session as completed in DB
    if (sessionId) {
      try {
        await buSupabase
          .from('okr_wizard_sessions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', sessionId);
      } catch (e) {
        console.error('Failed to complete wizard session:', e);
      }
    }
    
    setDraft(createEmptyDraft());
    setSessionId(null);
    setLastSavedAt(null);
    setIsDirty(false);
    setIsResumingDraft(false);
  }, [storageKey, sessionId, createEmptyDraft]);
  
  // Persist changes to localStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (isDirty && enabled) {
      persistToStorage(draft);
    }
  }, [draft, isDirty, enabled, persistToStorage]);
  
  // Update teamId/cycleId in draft when they change
  useEffect(() => {
    if (draft.teamId !== teamId || draft.cycleId !== cycleId) {
      setDraft(prev => ({ ...prev, teamId, cycleId }));
    }
  }, [teamId, cycleId]);
  
  return {
    draft,
    updateDraft,
    setStep,
    clearDraft,
    discardDraft,
    saveDraft,
    isDirty,
    isSaving: saveDraftMutation.isPending,
    isResumingDraft,
    hasSavedDraft: hasSavedDraft || !!existingSessionQuery.data,
    lastSavedAt,
    sessionId,
  };
}
