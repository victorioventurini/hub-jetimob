import { useState, useEffect, useCallback } from 'react';
import type { VicAgentSlug, VicContext, VicInvokeResponse } from '../types';

/**
 * Storage key prefix for AI feedback drafts
 */
const STORAGE_KEY_PREFIX = 'vic-feedback-draft';

/**
 * Draft version for migration support
 */
const DRAFT_VERSION = 1;

/**
 * TTL for drafts in milliseconds (24 hours)
 */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Entity types that can have AI feedback drafts
 */
export type VicFeedbackEntityType = 
  | 'objective' 
  | 'org-objective' 
  | 'kpi' 
  | 'initiative' 
  | 'kr';

/**
 * Persisted AI feedback draft structure
 */
export interface VicFeedbackDraft {
  /** Draft version for migration */
  version: number;
  /** AI response text */
  response: string;
  /** Agent that generated the response */
  agentSlug: VicAgentSlug;
  /** Original context sent to the agent */
  context: VicContext;
  /** When the draft was created */
  createdAt: string;
  /** Token usage (if available) */
  tokensUsed?: number;
  /** Latency in ms (if available) */
  latencyMs?: number;
}

/**
 * Options for useVicFeedbackDraft hook
 */
export interface UseVicFeedbackDraftOptions {
  /** Entity type (objective, kpi, initiative, etc) */
  entityType: VicFeedbackEntityType;
  /** Entity ID for editing mode. undefined = creation mode */
  entityId?: string;
  /** Disable persistence (useful when editing) */
  disabled?: boolean;
}

/**
 * Return type for useVicFeedbackDraft hook
 */
export interface UseVicFeedbackDraftReturn {
  /** Current draft (if exists) */
  draft: VicFeedbackDraft | null;
  /** Whether a valid draft exists */
  hasDraft: boolean;
  /** Save a new feedback draft */
  setDraft: (response: VicInvokeResponse, context: VicContext) => void;
  /** Clear the draft from storage */
  clearDraft: () => void;
  /** Storage key for debugging */
  storageKey: string;
}

/**
 * Generate storage key for an entity
 */
function getStorageKey(entityType: VicFeedbackEntityType, entityId?: string): string {
  return `${STORAGE_KEY_PREFIX}-${entityType}-${entityId || 'new'}`;
}

/**
 * Check if draft is still valid (not expired)
 */
function isDraftValid(draft: VicFeedbackDraft): boolean {
  if (draft.version !== DRAFT_VERSION) return false;
  
  const createdAt = new Date(draft.createdAt).getTime();
  const now = Date.now();
  
  return (now - createdAt) < DRAFT_TTL_MS;
}

/**
 * Load draft from localStorage
 */
function loadDraft(storageKey: string): VicFeedbackDraft | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    
    const draft: VicFeedbackDraft = JSON.parse(raw);
    
    if (!isDraftValid(draft)) {
      localStorage.removeItem(storageKey);
      return null;
    }
    
    return draft;
  } catch (error) {
    console.warn('[VicFeedbackDraft] Failed to load draft:', error);
    return null;
  }
}

/**
 * Save draft to localStorage
 */
function saveDraft(storageKey: string, draft: VicFeedbackDraft): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch (error) {
    console.warn('[VicFeedbackDraft] Failed to save draft:', error);
  }
}

/**
 * Remove draft from localStorage
 */
function removeDraft(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('[VicFeedbackDraft] Failed to remove draft:', error);
  }
}

/**
 * Hook for persisting AI feedback drafts in localStorage.
 * 
 * Follows the same pattern as useKrWizardDraft for consistency.
 * Drafts are stored per entity type and ID, with a 24h TTL.
 * 
 * @example
 * ```tsx
 * const { draft, hasDraft, setDraft, clearDraft } = useVicFeedbackDraft({
 *   entityType: 'objective',
 *   entityId: objective?.id, // undefined for creation
 * });
 * 
 * // Save feedback from VicActionButton
 * <VicActionButton
 *   onApply={(response, fullResponse) => {
 *     setDraft(fullResponse, context);
 *     // Apply to form...
 *   }}
 * />
 * 
 * // Clear on successful save
 * onSuccess: () => {
 *   clearDraft();
 * }
 * ```
 */
export function useVicFeedbackDraft({
  entityType,
  entityId,
  disabled = false,
}: UseVicFeedbackDraftOptions): UseVicFeedbackDraftReturn {
  const storageKey = getStorageKey(entityType, entityId);
  
  const [draft, setDraftState] = useState<VicFeedbackDraft | null>(() => {
    if (disabled) return null;
    return loadDraft(storageKey);
  });

  // Reload draft when key changes (e.g., switching between create/edit)
  useEffect(() => {
    if (disabled) {
      setDraftState(null);
      return;
    }
    
    const loaded = loadDraft(storageKey);
    setDraftState(loaded);
  }, [storageKey, disabled]);

  const setDraft = useCallback((response: VicInvokeResponse, context: VicContext) => {
    if (disabled) return;
    
    const newDraft: VicFeedbackDraft = {
      version: DRAFT_VERSION,
      response: response.response,
      agentSlug: response.agentSlug as VicAgentSlug,
      context,
      createdAt: new Date().toISOString(),
      tokensUsed: response.tokensUsed,
      latencyMs: response.latencyMs,
    };
    
    setDraftState(newDraft);
    saveDraft(storageKey, newDraft);
  }, [storageKey, disabled]);

  const clearDraft = useCallback(() => {
    setDraftState(null);
    removeDraft(storageKey);
  }, [storageKey]);

  return {
    draft,
    hasDraft: draft !== null,
    setDraft,
    clearDraft,
    storageKey,
  };
}

/**
 * Cleanup utility to remove all expired drafts.
 * Call this on app mount to prevent localStorage bloat.
 */
export function cleanupExpiredVicDrafts(): number {
  let cleaned = 0;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue;
      
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        
        const draft: VicFeedbackDraft = JSON.parse(raw);
        if (!isDraftValid(draft)) {
          keysToRemove.push(key);
        }
      } catch {
        // Invalid JSON, remove it
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      cleaned++;
    });
    
    if (cleaned > 0) {
      console.log(`[VicFeedbackDraft] Cleaned ${cleaned} expired drafts`);
    }
  } catch (error) {
    console.warn('[VicFeedbackDraft] Cleanup failed:', error);
  }
  
  return cleaned;
}
