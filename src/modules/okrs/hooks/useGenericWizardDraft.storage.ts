/**
 * useGenericWizardDraft — Helpers de localStorage
 *
 * Extraído do hook monolítico (refatoração P1).
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';
import { DRAFT_VERSION, type GenericWizardDraft } from './useGenericWizardDraft.types';

export function getDraftKey(wizardType: WizardPersona, teamId?: string | null): string {
  return teamId ? `okr-draft.${wizardType}.${teamId}` : `okr-draft.${wizardType}`;
}

export function readDraftFromStorage<TStep extends string, TData>(
  storageKey: string,
  wizardType: WizardPersona,
): GenericWizardDraft<TStep, TData> | null {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as GenericWizardDraft<TStep, TData>;
    if (parsed.version === DRAFT_VERSION && parsed.wizardType === wizardType) {
      return parsed;
    }
    return null;
  } catch (e) {
    console.warn('[wizardDraft] Failed to read draft from localStorage:', e);
    return null;
  }
}

export function hasLocalDraft(storageKey: string, wizardType: WizardPersona): boolean {
  return readDraftFromStorage(storageKey, wizardType) !== null;
}

export function writeDraftToStorage<TStep extends string, TData>(
  storageKey: string,
  draft: GenericWizardDraft<TStep, TData>,
): void {
  try {
    const toSave = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(toSave));
  } catch (e) {
    console.error('[wizardDraft] Failed to persist draft:', e);
  }
}

export function clearDraftFromStorage(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch (e) {
    console.error('[wizardDraft] Failed to clear draft from localStorage:', e);
  }
}
