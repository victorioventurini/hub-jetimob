/**
 * ManagersCheckinWizard - Orquestrador do Wizard de Check-in de Gestores (Wizard 4)
 * 
 * Refatorado para usar useWizardOrchestrator
 * 
 * Fluxo:
 * 1. Panorama - Visão geral de todas as áreas
 * 2. Cross Issues - Dependências e bloqueios
 * 3. Adjustments - Ajustes de foco
 */

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { WizardShell } from '../shared/WizardShell';
import { ManagersPanoramaStep } from './ManagersPanoramaStep';
import { ManagersCrossIssuesStep } from './ManagersCrossIssuesStep';
import { ManagersAdjustmentsStep } from './ManagersAdjustmentsStep';
import { useWizardOrchestrator } from '@/modules/okrs/hooks/useWizardOrchestrator';
import { WIZARD_CONFIGS, type AreaOkrSummary, type CrossDependency } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface ManagersCheckinWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ['panorama', 'cross-issues', 'adjustments'] as const;
type WizardStep = typeof STEPS[number];

// ============================================================
// COMPONENT
// ============================================================

export function ManagersCheckinWizard({ 
  open, 
  onOpenChange,
}: ManagersCheckinWizardProps) {
  const config = WIZARD_CONFIGS['managers-checkin'];
  
  // Orchestrator handles session + navigation + cycle
  const {
    currentStep,
    stepIndex,
    goToStep,
    handleClose,
    completeWizard,
  } = useWizardOrchestrator<WizardStep>({
    wizardType: 'managers-checkin',
    steps: STEPS,
    open,
    onOpenChange,
    skipCycleFetch: true, // Managers don't need cycle
  });
  
  // Local state
  const [adjustments, setAdjustments] = useState<string[]>([]);

  // Mock data (in real implementation, fetch from API)
  const areas: AreaOkrSummary[] = useMemo(() => [
    { areaName: 'Produto', teamId: 'team-1', okrCount: 5, avgProgress: 72, trend: 'improving', atRiskCount: 1 },
    { areaName: 'Engenharia', teamId: 'team-2', okrCount: 8, avgProgress: 58, trend: 'stable', atRiskCount: 2 },
    { areaName: 'Comercial', teamId: 'team-3', okrCount: 4, avgProgress: 85, trend: 'improving', atRiskCount: 0 },
    { areaName: 'Marketing', teamId: 'team-4', okrCount: 3, avgProgress: 45, trend: 'declining', atRiskCount: 1 },
  ], []);

  const dependencies: CrossDependency[] = useMemo(() => [
    {
      id: 'dep-1',
      description: 'API de integração para campanha de marketing',
      fromTeam: { id: 'team-2', name: 'Engenharia' },
      toTeam: { id: 'team-4', name: 'Marketing' },
      status: 'at_risk',
    },
    {
      id: 'dep-2',
      description: 'Feature de checkout para meta comercial',
      fromTeam: { id: 'team-1', name: 'Produto' },
      toTeam: { id: 'team-3', name: 'Comercial' },
      status: 'healthy',
    },
  ], []);

  const companyProgress = useMemo(() => {
    if (areas.length === 0) return 0;
    return Math.round(areas.reduce((sum, a) => sum + a.avgProgress, 0) / areas.length);
  }, [areas]);

  // Handlers
  const handleComplete = useCallback(async () => {
    await completeWizard({
      actionItems: adjustments.map(a => ({ task: a, ownerId: '' })),
    });
    
    toast.success('Check-in de gestores concluído!');
    handleClose();
  }, [completeWizard, adjustments, handleClose]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'panorama':
        return (
          <ManagersPanoramaStep
            areas={areas}
            companyProgress={companyProgress}
            onContinue={() => goToStep('cross-issues')}
          />
        );

      case 'cross-issues':
        return (
          <ManagersCrossIssuesStep
            dependencies={dependencies}
            onContinue={() => goToStep('adjustments')}
            onBack={() => goToStep('panorama')}
          />
        );

      case 'adjustments':
        return (
          <ManagersAdjustmentsStep
            adjustments={adjustments}
            onAdjustmentsChange={setAdjustments}
            onComplete={handleComplete}
            onBack={() => goToStep('cross-issues')}
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
      persona="managers-checkin"
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
