/**
 * useGenericWizardDraft — Tipos compartilhados
 *
 * Extraído do hook monolítico (refatoração P1). Mantém o contrato
 * público intacto: nada aqui muda comportamento de runtime.
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';

export const DRAFT_VERSION = 1;

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
  clearDraft: () => Promise<string | null>;
  discardDraft: () => Promise<void>;
  saveDraft: () => Promise<void>;
  reopenSession: (sessionId: string) => Promise<boolean>;
  isDirty: boolean;
  isSaving: boolean;
  isResumingDraft: boolean;
  hasSavedDraft: boolean;
  lastSavedAt: string | null;
  sessionId: string | null;
}
