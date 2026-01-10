/**
 * TeamCheckinWizard - Orquestrador do Wizard de Check-in do Time (Wizard 3)
 * 
 * Fluxo (durante reunião):
 * 1. Opening - Abertura e visão geral
 * 2. KR Review - Revisão dos KRs marcados
 * 3. Initiatives - Iniciativas relevantes
 * 4. Decisions - Decisões e próximos passos
 */

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { WizardShell } from '../shared/WizardShell';
import { TeamOpeningStep } from './TeamOpeningStep';
import { TeamKrReviewStep } from './TeamKrReviewStep';
import { TeamInitiativesStep } from './TeamInitiativesStep';
import { TeamDecisionsStep } from './TeamDecisionsStep';
import { useTeamPendingKrs } from '@/modules/okrs/hooks/useTeamPendingKrs';
import { useActiveCycles, useCycle } from '@/modules/okrs/hooks/useCycleData';
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
    onOpenChange(false);
  }, [onOpenChange]);

  const handleMarkReviewed = useCallback((krId: string) => {
    setReviewedKrs(prev => new Set(prev).add(krId));
  }, []);

  const handleComplete = useCallback(() => {
    toast.success('Check-in do time concluído!');
    handleClose();
  }, [handleClose]);

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
