/**
 * useWizardOrchestrator - Hook consolidado para orquestração de wizards OKR
 * 
 * Elimina duplicação de:
 * - Session management (create, update, complete)
 * - Step navigation (current step, step index, navigation handlers)
 * - Cycle fetching (active cycles)
 * - Close/reset logic
 * 
 * @example
 * const { 
 *   stepIndex, 
 *   goToStep, 
 *   goNext, 
 *   goBack, 
 *   handleClose,
 *   session,
 *   cycle,
 * } = useWizardOrchestrator({
 *   wizardType: 'collaborator',
 *   steps: ['context', 'checkin', 'reflection', 'summary'],
 *   open,
 *   onOpenChange,
 *   teamId,
 * });
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWizardSession, type SaveKrActionParams } from './useWizardSession';
import { useActiveCycles, useCycle } from './useCycleData';
import type { WizardPersona } from '../types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface WizardOrchestratorConfig<TStep extends string> {
  /** Wizard type for session tracking */
  wizardType: WizardPersona;
  /** Ordered list of step IDs */
  steps: readonly TStep[];
  /** Initial step (defaults to first step) */
  initialStep?: TStep;
  /** Whether the wizard is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Optional team ID for team-scoped wizards */
  teamId?: string;
  /** Optional user ID for user-scoped wizards */
  userId?: string;
  /** Callback before close (return false to prevent) */
  onBeforeClose?: () => boolean | Promise<boolean>;
  /** Callback after session is created */
  onSessionCreated?: (sessionId: string) => void;
  /** Skip cycle fetching (for wizards that don't need it) */
  skipCycleFetch?: boolean;
}

export interface WizardOrchestratorResult<TStep extends string> {
  // Step navigation
  currentStep: TStep;
  stepIndex: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  goToStep: (step: TStep) => void;
  goNext: () => void;
  goBack: () => void;
  
  // Session
  sessionId: string | null;
  isCreatingSession: boolean;
  saveKrAction: (krId: string, actionType: SaveKrActionParams['actionType'], notes?: string) => Promise<void>;
  completeWizard: (data?: Record<string, unknown>) => Promise<void>;
  
  // Cycle data
  cycle: { id: string; name: string; type: string } | null;
  cycleId: string | null;
  isCycleLoading: boolean;
  
  // Close handler
  handleClose: () => void;
  
  // Reset (for external use)
  reset: () => void;
}

// ============================================================
// HOOK
// ============================================================

export function useWizardOrchestrator<TStep extends string>(
  config: WizardOrchestratorConfig<TStep>
): WizardOrchestratorResult<TStep> {
  const {
    wizardType,
    steps,
    initialStep,
    open,
    onOpenChange,
    teamId,
    userId,
    onBeforeClose,
    onSessionCreated,
    skipCycleFetch = false,
  } = config;

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================
  
  const {
    createSession,
    completeSession,
    saveKrAction: saveKrActionRaw,
    isCreating: isCreatingSession,
  } = useWizardSession();
  
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ============================================================
  // STEP NAVIGATION
  // ============================================================
  
  const [currentStep, setCurrentStep] = useState<TStep>(initialStep ?? steps[0]);
  
  const stepIndex = useMemo(() => {
    const idx = steps.indexOf(currentStep);
    return idx >= 0 ? idx : 0;
  }, [steps, currentStep]);
  
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  const goToStep = useCallback((step: TStep) => {
    if (steps.includes(step)) {
      setCurrentStep(step);
    }
  }, [steps]);

  const goNext = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep(steps[stepIndex + 1]);
    }
  }, [isLastStep, steps, stepIndex]);

  const goBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(steps[stepIndex - 1]);
    }
  }, [isFirstStep, steps, stepIndex]);

  // ============================================================
  // CYCLE FETCHING
  // ============================================================
  
  const { data: activeCycles, isLoading: cyclesLoading } = useActiveCycles();
  
  const quarterlyCycle = useMemo(() => {
    if (skipCycleFetch || !activeCycles) return null;
    return activeCycles.find(c => c.type === 'quarter') || activeCycles[0] || null;
  }, [activeCycles, skipCycleFetch]);
  
  const cycleId = quarterlyCycle?.id ?? null;
  const { data: cycleData, isLoading: cycleLoading } = useCycle(cycleId);
  
  const cycle = useMemo(() => {
    if (!cycleData) return null;
    return {
      id: cycleData.id,
      name: cycleData.name,
      type: cycleData.type,
    };
  }, [cycleData]);

  // ============================================================
  // SESSION CREATION
  // ============================================================
  
  useEffect(() => {
    if (open && !sessionId && !isCreatingSession) {
      createSession({
        wizardType,
        teamId: teamId || null,
        cycleId: cycleId || null,
      }).then(session => {
        setSessionId(session.id);
        onSessionCreated?.(session.id);
      }).catch(err => {
        console.error(`[useWizardOrchestrator] Failed to create session for ${wizardType}:`, err);
      });
    }
  }, [open, sessionId, isCreatingSession, createSession, wizardType, teamId, cycleId, onSessionCreated]);

  // ============================================================
  // RESET & CLOSE
  // ============================================================
  
  const reset = useCallback(() => {
    setCurrentStep(initialStep ?? steps[0]);
    setSessionId(null);
  }, [initialStep, steps]);

  const handleClose = useCallback(async () => {
    // Check if we can close
    if (onBeforeClose) {
      const canClose = await onBeforeClose();
      if (!canClose) return;
    }
    
    reset();
    onOpenChange(false);
  }, [onBeforeClose, reset, onOpenChange]);

  // Reset when wizard reopens or context changes
  useEffect(() => {
    if (!open) return;
    // Reset step when context changes (team/user switch)
    setCurrentStep(initialStep ?? steps[0]);
  }, [open, teamId, userId, initialStep, steps]);

  // ============================================================
  // SESSION ACTIONS
  // ============================================================
  
  const saveKrAction = useCallback(async (
    krId: string, 
    actionType: SaveKrActionParams['actionType'], 
    notes?: string
  ) => {
    if (!sessionId) return;
    
    try {
      await saveKrActionRaw({
        sessionId,
        krId,
        actionType,
        notes,
      });
    } catch (err) {
      console.error('[useWizardOrchestrator] Failed to save KR action:', err);
    }
  }, [sessionId, saveKrActionRaw]);

  const completeWizard = useCallback(async (data?: Record<string, unknown>) => {
    if (!sessionId) return;
    
    try {
      await completeSession({
        sessionId,
        ...data,
      });
    } catch (err) {
      console.error('[useWizardOrchestrator] Failed to complete session:', err);
    }
  }, [sessionId, completeSession]);

  // ============================================================
  // RETURN
  // ============================================================
  
  return {
    // Step navigation
    currentStep,
    stepIndex,
    isFirstStep,
    isLastStep,
    goToStep,
    goNext,
    goBack,
    
    // Session
    sessionId,
    isCreatingSession,
    saveKrAction,
    completeWizard,
    
    // Cycle data
    cycle,
    cycleId,
    isCycleLoading: cyclesLoading || cycleLoading,
    
    // Close handler
    handleClose,
    
    // Reset
    reset,
  };
}
