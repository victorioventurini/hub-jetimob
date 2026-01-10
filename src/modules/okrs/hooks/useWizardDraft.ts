/**
 * useWizardDraft - Hook para persistência de rascunhos de wizard
 * 
 * Persiste o estado do wizard em:
 * 1. localStorage (imediato, offline-first)
 * 2. okr_wizard_sessions (sync explícito ao clicar "Salvar rascunho")
 * 
 * Isso previne perda de dados ao:
 * - Trocar de aba e voltar
 * - Refresh da página
 * - Navegação acidental
 * - Continuar depois em outro dispositivo
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import type { 
  DraftTeamKr, 
  DraftTeamDependency, 
  DraftTeamInitiative,
  ResponsibilityModel,
  OwnerType,
} from '@/modules/okrs/types/wizard';
import type { KrPlan } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrKrTypeStep';

// ============================================================
// TYPES
// ============================================================

export type WizardStep = 
  | 'intro' 
  | 'context' 
  | 'retrospective' 
  | 'objective' 
  | 'sharing'
  | 'kr-type' 
  | 'kr-detail' 
  | 'dependencies' 
  | 'initiatives' 
  | 'review';

export interface TeamOkrDraft {
  // Meta
  version: number;
  createdAt: string;
  updatedAt: string;
  
  // Navigation
  currentStep: WizardStep;
  
  // Step 1 - Context
  impactReflection: string;
  
  // Step 3 - Objective
  objectiveTitle: string;
  objectiveDescription: string;
  selectedOrgObjectiveId: string | null;
  
  // Step 4 - Sharing
  isShared: boolean;
  responsibilityModel: ResponsibilityModel;
  ownerType: OwnerType;
  primaryTeamId: string;
  contributingTeamIds: string[];
  
  // Step 5/6 - KRs
  krPlan: KrPlan;
  draftKrs: DraftTeamKr[];
  
  // Step 7 - Dependencies
  dependencies: DraftTeamDependency[];
  
  // Step 8 - Initiatives
  initiatives: DraftTeamInitiative[];
}

const DRAFT_VERSION = 1;

const createEmptyDraft = (teamId: string): TeamOkrDraft => ({
  version: DRAFT_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentStep: 'intro',
  impactReflection: '',
  objectiveTitle: '',
  objectiveDescription: '',
  selectedOrgObjectiveId: null,
  isShared: false,
  responsibilityModel: 'primary_led',
  ownerType: 'my_team',
  primaryTeamId: teamId,
  contributingTeamIds: [],
  krPlan: { foundational: 1, contribution: 0, enabler: 0 },
  draftKrs: [],
  dependencies: [],
  initiatives: [],
});

// ============================================================
// STORAGE KEY HELPER
// ============================================================

function getDraftKey(teamId: string, cycleId: string): string {
  return `okr-draft.team-okr-creation.${teamId}.${cycleId}`;
}

// ============================================================
// HOOK
// ============================================================

export interface UseWizardDraftOptions {
  teamId: string;
  cycleId: string | null;
  enabled?: boolean;
}

export interface UseWizardDraftReturn {
  draft: TeamOkrDraft;
  updateDraft: (updates: Partial<TeamOkrDraft>) => void;
  setStep: (step: WizardStep) => void;
  clearDraft: () => void;
  saveDraft: () => Promise<void>;
  isDirty: boolean;
  isSaving: boolean;
  hasSavedDraft: boolean;
  lastSavedAt: string | null;
}

export function useWizardDraft({
  teamId,
  cycleId,
  enabled = true,
}: UseWizardDraftOptions): UseWizardDraftReturn {
  const { profile } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  
  const storageKey = cycleId ? getDraftKey(teamId, cycleId) : null;
  
  // Session ID for database sync
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  
  // Check for existing draft session in DB
  const existingSessionQuery = useQuery({
    queryKey: queryKeys.okrs.wizardDraft(teamId, cycleId || ''),
    queryFn: async () => {
      if (!profile?.id || !cycleId) return null;
      
      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .select('id, reflection_data, updated_at')
        .eq('started_by', profile.id)
        .eq('team_id', teamId)
        .eq('cycle_id', cycleId)
        .eq('wizard_type', 'team-okr-creation')
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !!cycleId && enabled,
  });
  
  // Initialize state from localStorage OR database
  const [draft, setDraft] = useState<TeamOkrDraft>(() => {
    if (!storageKey || !enabled) return createEmptyDraft(teamId);
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as TeamOkrDraft;
        if (parsed.version === DRAFT_VERSION) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load wizard draft:', e);
    }
    
    return createEmptyDraft(teamId);
  });
  
  // Load from DB if localStorage is empty but DB has data
  useEffect(() => {
    if (existingSessionQuery.data && !localStorage.getItem(storageKey || '')) {
      const dbData = existingSessionQuery.data.reflection_data as unknown;
      if (dbData && typeof dbData === 'object' && 'version' in dbData && (dbData as TeamOkrDraft).version === DRAFT_VERSION) {
        setDraft(dbData as TeamOkrDraft);
        setSessionId(existingSessionQuery.data.id);
        setLastSavedAt(existingSessionQuery.data.updated_at);
      }
    }
  }, [existingSessionQuery.data, storageKey]);
  
  const [isDirty, setIsDirty] = useState(false);
  const [hasSavedDraft] = useState(() => {
    if (!storageKey) return false;
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });
  
  // Track initial load
  const isInitialMount = useRef(true);
  
  // Persist to localStorage with debounce
  const persistToStorage = useDebouncedCallback((draftToSave: TeamOkrDraft) => {
    if (!storageKey || !enabled) return;
    
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
    mutationFn: async (draftToSave: TeamOkrDraft): Promise<string> => {
      if (!profile?.id || !currentBu?.id || !cycleId) {
        throw new Error('User, BU or cycle not available');
      }
      
      // Convert to JSON-compatible format
      const reflectionData = JSON.parse(JSON.stringify({
        ...draftToSave,
        updatedAt: new Date().toISOString(),
      }));
      
      if (sessionId) {
        // Update existing session
        const { error } = await supabase
          .from('okr_wizard_sessions')
          .update({
            reflection_data: reflectionData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
        
        if (error) throw error;
        return sessionId;
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('okr_wizard_sessions')
          .insert([{
            bu_id: currentBu.id,
            wizard_type: 'team-okr-creation' as const,
            team_id: teamId,
            cycle_id: cycleId,
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
        queryKey: queryKeys.okrs.wizardDraft(teamId, cycleId || '') 
      });
    },
  });
  
  // Update draft
  const updateDraft = useCallback((updates: Partial<TeamOkrDraft>) => {
    setDraft(prev => {
      const updated = { ...prev, ...updates };
      setIsDirty(true);
      return updated;
    });
  }, []);
  
  // Convenience: set step
  const setStep = useCallback((step: WizardStep) => {
    updateDraft({ currentStep: step });
  }, [updateDraft]);
  
  // Save draft explicitly
  const saveDraft = useCallback(async () => {
    await saveDraftMutation.mutateAsync(draft);
  }, [saveDraftMutation, draft]);
  
  // Clear draft
  const clearDraft = useCallback(async () => {
    // Clear localStorage
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error('Failed to clear wizard draft:', e);
      }
    }
    
    // Mark session as abandoned in DB
    if (sessionId) {
      try {
        await supabase
          .from('okr_wizard_sessions')
          .update({ status: 'abandoned' })
          .eq('id', sessionId);
      } catch (e) {
        console.error('Failed to abandon wizard session:', e);
      }
    }
    
    setDraft(createEmptyDraft(teamId));
    setSessionId(null);
    setLastSavedAt(null);
    setIsDirty(false);
  }, [storageKey, teamId, sessionId]);
  
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
  
  // Update primaryTeamId when teamId changes
  useEffect(() => {
    if (draft.primaryTeamId !== teamId && draft.currentStep === 'intro') {
      updateDraft({ primaryTeamId: teamId });
    }
  }, [teamId, draft.primaryTeamId, draft.currentStep, updateDraft]);
  
  return {
    draft,
    updateDraft,
    setStep,
    clearDraft,
    saveDraft,
    isDirty,
    isSaving: saveDraftMutation.isPending,
    hasSavedDraft: hasSavedDraft || !!existingSessionQuery.data,
    lastSavedAt,
  };
}
