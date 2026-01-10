/**
 * CollaboratorWizard - Orquestrador do Wizard do Colaborador (Wizard 1)
 * 
 * Fluxo:
 * 1. Contexto - Visão geral dos KRs
 * 2. Check-in - Atualização sequencial de cada KR
 * 3. Iniciativas - Revisão de iniciativas (opcional)
 * 4. Reflexão - Perguntas finais
 * 5. Resumo - Visão consolidada
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WizardShell } from '../shared/WizardShell';
import { CollaboratorContextStep } from './CollaboratorContextStep';
import { CollaboratorCheckinStep } from './CollaboratorCheckinStep';
import { CollaboratorInitiativesStep } from './CollaboratorInitiativesStep';
import { CollaboratorReflectionStep } from './CollaboratorReflectionStep';
import { CollaboratorSummary } from './CollaboratorSummary';
import { useUserKrsForWizard } from '@/modules/okrs/hooks/useUserKrsForWizard';
import { useActiveCycles, useCycle } from '@/modules/okrs/hooks/useCycleData';
import { useWizardSession } from '@/modules/okrs/hooks/useWizardSession';
import { WIZARD_CONFIGS, type CollaboratorCheckinResult, type CollaboratorReflection } from '@/modules/okrs/types/wizard';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 'context' | 'checkin' | 'initiatives' | 'reflection' | 'summary';

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorWizard({ open, onOpenChange }: CollaboratorWizardProps) {
  const navigate = useNavigate();
  const config = WIZARD_CONFIGS['collaborator'];
  
  // Session persistence
  const { 
    createSession, 
    updateSession, 
    completeSession, 
    saveKrAction,
    isCreating 
  } = useWizardSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('context');
  const [currentKrIndex, setCurrentKrIndex] = useState(0);
  const [results, setResults] = useState<CollaboratorCheckinResult[]>([]);
  const [reflection, setReflection] = useState<CollaboratorReflection>({});
  const [initiativesMarkedAtRisk, setInitiativesMarkedAtRisk] = useState<string[]>([]);

  // Get active quarterly cycle
  const { data: activeCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(() => 
    activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );
  
  const { data: cycle } = useCycle(quarterlyCycle?.id);

  // Fetch user's KRs for the active cycle
  const { data: allKrs = [], isLoading: krsLoading } = useUserKrsForWizard(
    quarterlyCycle?.id,
    'all'
  );

  // Get KRs that need check-in (pending or at risk, prioritized)
  const krsToCheckin = useMemo(() => {
    if (!allKrs.length) return [];
    
    // Prioritize: pending first, then at risk, then others
    return [...allKrs].sort((a, b) => {
      // Pending first
      if (a.is_pending && !b.is_pending) return -1;
      if (!a.is_pending && b.is_pending) return 1;
      // Then at risk
      if (a.is_at_risk && !b.is_at_risk) return -1;
      if (!a.is_at_risk && b.is_at_risk) return 1;
      // Then by days since checkin
      return b.days_since_checkin - a.days_since_checkin;
    });
  }, [allKrs]);

  // Current KR
  const currentKr = krsToCheckin[currentKrIndex] as WizardKr | undefined;

  // Step index for progress
  const stepIndex = useMemo(() => {
    switch (currentStep) {
      case 'context': return 0;
      case 'checkin': return 1;
      case 'initiatives': return 2;
      case 'reflection': return 3;
      case 'summary': return 4;
      default: return 0;
    }
  }, [currentStep]);

  // Create session when wizard opens
  useEffect(() => {
    if (open && !sessionId && !isCreating) {
      createSession({
        wizardType: 'collaborator',
        cycleId: quarterlyCycle?.id || null,
      }).then(session => {
        setSessionId(session.id);
      }).catch(err => {
        console.error('Failed to create wizard session:', err);
      });
    }
  }, [open, sessionId, isCreating, createSession, quarterlyCycle?.id]);

  // Handlers
  const handleClose = useCallback(() => {
    // Reset state
    setCurrentStep('context');
    setCurrentKrIndex(0);
    setResults([]);
    setReflection({});
    setInitiativesMarkedAtRisk([]);
    setSessionId(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleContextContinue = useCallback(() => {
    if (krsToCheckin.length > 0) {
      setCurrentStep('checkin');
    } else {
      setCurrentStep('reflection');
    }
  }, [krsToCheckin.length]);

  const handleCheckinComplete = useCallback((result: CollaboratorCheckinResult) => {
    setResults(prev => [...prev, result]);
    
    // Save KR action to session
    if (sessionId) {
      saveKrAction({
        sessionId,
        krId: result.krId,
        actionType: result.skipped ? 'skipped' : 'checked_in',
        notes: result.comment,
      }).catch(err => console.error('Failed to save KR action:', err));
    }
    
    if (currentKrIndex < krsToCheckin.length - 1) {
      setCurrentKrIndex(prev => prev + 1);
    } else {
      // All KRs done, move to initiatives
      setCurrentStep('initiatives');
    }
  }, [currentKrIndex, krsToCheckin.length, sessionId, saveKrAction]);

  const handleCheckinSkip = useCallback(() => {
    // Add skipped result
    if (currentKr) {
      const result: CollaboratorCheckinResult = {
        krId: currentKr.id,
        krTitle: currentKr.title,
        objectiveTitle: currentKr.objective_title,
        previousValue: currentKr.current_value,
        newValue: currentKr.current_value,
        confidence: 'medium',
        skipped: true,
      };
      setResults(prev => [...prev, result]);
      
      // Save skipped action
      if (sessionId) {
        saveKrAction({
          sessionId,
          krId: currentKr.id,
          actionType: 'skipped',
        }).catch(err => console.error('Failed to save KR action:', err));
      }
    }
    
    if (currentKrIndex < krsToCheckin.length - 1) {
      setCurrentKrIndex(prev => prev + 1);
    } else {
      setCurrentStep('initiatives');
    }
  }, [currentKr, currentKrIndex, krsToCheckin.length, sessionId, saveKrAction]);

  const handleCheckinBack = useCallback(() => {
    if (currentKrIndex > 0) {
      setCurrentKrIndex(prev => prev - 1);
      // Remove last result
      setResults(prev => prev.slice(0, -1));
    } else {
      setCurrentStep('context');
    }
  }, [currentKrIndex]);

  const handleInitiativesContinue = useCallback((markedAtRisk: string[]) => {
    setInitiativesMarkedAtRisk(markedAtRisk);
    setCurrentStep('reflection');
  }, []);

  const handleInitiativesSkip = useCallback(() => {
    setCurrentStep('reflection');
  }, []);

  const handleInitiativesBack = useCallback(() => {
    if (krsToCheckin.length > 0) {
      setCurrentKrIndex(krsToCheckin.length - 1);
      setResults(prev => prev.slice(0, -1));
      setCurrentStep('checkin');
    } else {
      setCurrentStep('context');
    }
  }, [krsToCheckin.length]);

  const handleReflectionComplete = useCallback((ref: CollaboratorReflection) => {
    setReflection(ref);
    setCurrentStep('summary');
    
    // Complete session with reflection data
    if (sessionId) {
      completeSession({
        sessionId,
        reflectionData: ref as unknown as Record<string, unknown>,
      }).catch(err => console.error('Failed to complete session:', err));
    }
    
    toast.success('Check-in semanal concluído!');
  }, [sessionId, completeSession]);

  const handleReflectionBack = useCallback(() => {
    setCurrentStep('initiatives');
  }, []);

  const handleViewOkrs = useCallback(() => {
    handleClose();
    navigate('/okrs');
  }, [handleClose, navigate]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'context':
        return (
          <CollaboratorContextStep
            krs={allKrs}
            isLoading={krsLoading}
            cycleName={cycle?.name}
            onContinue={handleContextContinue}
          />
        );

      case 'checkin':
        if (!currentKr) {
          setCurrentStep('initiatives');
          return null;
        }
        return (
          <CollaboratorCheckinStep
            kr={currentKr}
            currentIndex={currentKrIndex}
            totalCount={krsToCheckin.length}
            onComplete={handleCheckinComplete}
            onSkip={handleCheckinSkip}
            onBack={handleCheckinBack}
          />
        );

      case 'initiatives':
        return (
          <CollaboratorInitiativesStep
            krs={krsToCheckin}
            onContinue={handleInitiativesContinue}
            onBack={handleInitiativesBack}
            onSkip={handleInitiativesSkip}
          />
        );

      case 'reflection':
        return (
          <CollaboratorReflectionStep
            results={results}
            onComplete={handleReflectionComplete}
            onBack={handleReflectionBack}
          />
        );

      case 'summary':
        return (
          <CollaboratorSummary
            results={results}
            reflection={reflection}
            initiativesMarkedAtRisk={initiativesMarkedAtRisk}
            cycleName={cycle?.name}
            onViewOkrs={handleViewOkrs}
            onClose={handleClose}
          />
        );

      default:
        return null;
    }
  };

  return (
    <WizardShell
      open={open}
      onOpenChange={onOpenChange}
      persona="collaborator"
      title={config.title}
      subtitle={config.description}
      steps={config.steps}
      currentStepIndex={stepIndex}
      onClose={handleClose}
    >
      {renderStepContent()}
    </WizardShell>
  );
}
