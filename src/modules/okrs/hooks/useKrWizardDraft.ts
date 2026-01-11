/**
 * useKrWizardDraft - Hook para persistir estado do wizard de criação de KRs
 * 
 * Usa localStorage para persistência simples (sem banco de dados)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DraftTeamKr, DraftTeamDependency, DraftTeamInitiative } from '../types/wizard';

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

export interface KrPlan {
  foundational: number;
  contribution: number;
  enabler: number;
}

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
  teamId: string;
  cycleId?: string | null;
  enabled?: boolean;
}

export interface UseKrWizardDraftReturn {
  draft: TeamKrDraft | null;
  updateDraft: (updates: Partial<TeamKrDraft>) => void;
  setStep: (step: KrWizardStep) => void;
  clearDraft: () => void;
  discardDraft: () => void;
  isDirty: boolean;
  hasSavedDraft: boolean;
  initializeDraft: () => void;
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
  const { objectiveId, teamId, cycleId = null, enabled = true } = options;

  // State
  const [draft, setDraft] = useState<TeamKrDraft | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const initializedRef = useRef(false);

  // Storage key
  const storageKey = getStorageKey(objectiveId);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    if (!enabled || !objectiveId || initializedRef.current) return;

    const savedLocal = localStorage.getItem(storageKey);

    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal) as TeamKrDraft;
        if (parsed.version === DRAFT_VERSION && parsed.objectiveId === objectiveId) {
          setDraft(parsed);
          setHasSavedDraft(true);
          initializedRef.current = true;
          return;
        }
      } catch (e) {
        console.error('Failed to parse local KR draft:', e);
        localStorage.removeItem(storageKey);
      }
    }

    initializedRef.current = true;
  }, [enabled, objectiveId, storageKey]);

  // ── Persist to localStorage when draft changes ──
  useEffect(() => {
    if (draft && isDirty) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setHasSavedDraft(true);
      } catch (e) {
        console.error('Failed to persist KR draft:', e);
      }
    }
  }, [draft, isDirty, storageKey]);

  // ── API ──
  const updateDraft = useCallback((updates: Partial<TeamKrDraft>) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  const setStep = useCallback((step: KrWizardStep) => {
    updateDraft({ currentStep: step });
  }, [updateDraft]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setDraft(null);
    setIsDirty(false);
    setHasSavedDraft(false);
    initializedRef.current = false;
  }, [storageKey]);

  const discardDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  const initializeDraft = useCallback(() => {
    if (!draft && objectiveId && teamId) {
      const newDraft = createEmptyDraft(objectiveId, teamId, cycleId);
      setDraft(newDraft);
      setIsDirty(true);
    }
  }, [draft, objectiveId, teamId, cycleId]);

  return {
    draft,
    updateDraft,
    setStep,
    clearDraft,
    discardDraft,
    isDirty,
    hasSavedDraft,
    initializeDraft,
  };
}
