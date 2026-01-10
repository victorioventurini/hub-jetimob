/**
 * TeamCheckinWizard - Orquestrador do Wizard de Check-in do Time (Wizard 3)
 * 
 * Fluxo (durante reunião):
 * 1. Opening - Abertura e visão geral
 * 2. KR Review - Revisão dos KRs marcados
 * 3. Initiatives - Iniciativas relevantes
 * 4. Decisions - Decisões e próximos passos
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { WizardShell } from '../shared/WizardShell';
import { TeamOpeningStep } from './TeamOpeningStep';
import { TeamKrReviewStep } from './TeamKrReviewStep';
import { TeamInitiativesStep } from './TeamInitiativesStep';
import { TeamDecisionsStep } from './TeamDecisionsStep';
import { useTeamPendingKrs } from '@/modules/okrs/hooks/useTeamPendingKrs';
import { useActiveCycles, useCycle } from '@/modules/okrs/hooks/useCycleData';
import { useWizardSession } from '@/modules/okrs/hooks/useWizardSession';
import { WIZARD_CONFIGS, type TeamCheckinDecision, type TeamCheckinChecklist } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface TeamCheckinWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  markedForDiscussion?: string[];
}

type WizardStep = 'opening' | 'kr-review' | 'initiatives' | 'decisions';

// ============================================================
// COMPONENT
// ============================================================

export function TeamCheckinWizard({ 
  open, 
  onOpenChange, 
  teamId,
  teamName,
  markedForDiscussion = [],
}: TeamCheckinWizardProps) {
  const config = WIZARD_CONFIGS['team-checkin'];
  
  // Session persistence
  const { 
    createSession, 
    completeSession, 
    saveKrAction,
    isCreating 
  } = useWizardSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('opening');
  const [reviewedKrs, setReviewedKrs] = useState<Set<string>>(new Set());
  const [decisions, setDecisions] = useState<TeamCheckinDecision[]>([]);
  const [checklist, setChecklist] = useState<TeamCheckinChecklist>({
    knowWhatToFocus: false,
    knowWhatNotToDo: false,
    knowWhoIsResponsible: false,
  });

  // Get active cycle
  const { data: activeCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(() => 
    activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );
  const { data: cycle } = useCycle(quarterlyCycle?.id);

  // Fetch team KRs
  const { data: teamKrs = [], isLoading: krsLoading } = useTeamPendingKrs(
    quarterlyCycle?.id,
    teamId ? [teamId] : []
  );

  // Mock initiatives (in real implementation, fetch from API)
  const initiatives = useMemo(() => 
    teamKrs.slice(0, 3).map(kr => ({
      id: `init-${kr.id}`,
      name: `Iniciativa para ${kr.title.substring(0, 30)}...`,
      status: kr.is_at_risk ? 'blocked' as const : 'in_progress' as const,
      krId: kr.id,
      krTitle: kr.title,
      ownerName: kr.owner_name || undefined,
    })),
    [teamKrs]
  );

  // Step index
  const stepIndex = useMemo(() => {
    switch (currentStep) {
      case 'opening': return 0;
      case 'kr-review': return 1;
      case 'initiatives': return 2;
      case 'decisions': return 3;
      default: return 0;
    }
  }, [currentStep]);

  // Create session when wizard opens
  useEffect(() => {
    if (open && !sessionId && !isCreating) {
      createSession({
        wizardType: 'team-checkin',
        teamId,
        cycleId: quarterlyCycle?.id || null,
      }).then(session => {
        setSessionId(session.id);
      }).catch(err => {
        console.error('Failed to create wizard session:', err);
      });
    }
  }, [open, sessionId, isCreating, createSession, teamId, quarterlyCycle?.id]);

  // Handlers
  const handleClose = useCallback(() => {
    setCurrentStep('opening');
    setReviewedKrs(new Set());
    setDecisions([]);
    setChecklist({
      knowWhatToFocus: false,
      knowWhatNotToDo: false,
      knowWhoIsResponsible: false,
    });
    setSessionId(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleMarkReviewed = useCallback((krId: string) => {
    setReviewedKrs(prev => new Set(prev).add(krId));
    
    // Save KR action
    if (sessionId) {
      saveKrAction({
        sessionId,
        krId,
        actionType: 'checked_in',
      }).catch(err => console.error('Failed to save KR action:', err));
    }
  }, [sessionId, saveKrAction]);

  const handleComplete = useCallback(async () => {
    // Complete session with decisions
    if (sessionId) {
      await completeSession({
        sessionId,
        decisions,
      }).catch(err => console.error('Failed to complete session:', err));
    }
    
    toast.success('Check-in do time concluído!');
    handleClose();
  }, [sessionId, completeSession, decisions, handleClose]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'opening':
        return (
          <TeamOpeningStep
            teamName={teamName}
            cycleName={cycle?.name}
            krs={teamKrs}
            markedForDiscussion={markedForDiscussion}
            isLoading={krsLoading}
            onContinue={() => setCurrentStep('kr-review')}
          />
        );

      case 'kr-review':
        return (
          <TeamKrReviewStep
            krs={teamKrs}
            markedForDiscussion={markedForDiscussion}
            reviewedKrs={reviewedKrs}
            onMarkReviewed={handleMarkReviewed}
            onContinue={() => setCurrentStep('initiatives')}
            onBack={() => setCurrentStep('opening')}
          />
        );

      case 'initiatives':
        return (
          <TeamInitiativesStep
            initiatives={initiatives}
            onContinue={() => setCurrentStep('decisions')}
            onBack={() => setCurrentStep('kr-review')}
          />
        );

      case 'decisions':
        return (
          <TeamDecisionsStep
            decisions={decisions}
            onDecisionsChange={setDecisions}
            checklist={checklist}
            onChecklistChange={setChecklist}
            onComplete={handleComplete}
            onBack={() => setCurrentStep('initiatives')}
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
      persona="team-checkin"
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
