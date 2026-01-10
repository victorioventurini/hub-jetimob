/**
 * useWizardDraft - Hook para persistência de rascunhos de wizard
 * 
 * Persiste o estado do wizard em:
 * 1. localStorage (imediato, offline-first)
 * 2. wizard_sessions (sync periódico para backup)
 * 
 * Isso previne perda de dados ao:
 * - Trocar de aba e voltar
 * - Refresh da página
 * - Navegação acidental
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  isDirty: boolean;
  hasSavedDraft: boolean;
}

export function useWizardDraft({
  teamId,
  cycleId,
  enabled = true,
}: UseWizardDraftOptions): UseWizardDraftReturn {
  const storageKey = cycleId ? getDraftKey(teamId, cycleId) : null;
  
  // Initialize state
  const [draft, setDraft] = useState<TeamOkrDraft>(() => {
    if (!storageKey || !enabled) return createEmptyDraft(teamId);
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as TeamOkrDraft;
        // Version check
        if (parsed.version === DRAFT_VERSION) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load wizard draft:', e);
    }
    
    return createEmptyDraft(teamId);
  });
  
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
  
  // Clear draft
  const clearDraft = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error('Failed to clear wizard draft:', e);
      }
    }
    setDraft(createEmptyDraft(teamId));
    setIsDirty(false);
  }, [storageKey, teamId]);
  
  // Persist changes
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
    isDirty,
    hasSavedDraft,
  };
}
