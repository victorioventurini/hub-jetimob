/**
 * ManagersCheckinWizard - Orquestrador do Wizard de Check-in de Gestores (Wizard 4)
 * 
 * Fluxo:
 * 1. Panorama - Visão geral de todas as áreas
 * 2. Cross Issues - Dependências e bloqueios
 * 3. Adjustments - Ajustes de foco
 */

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { WizardShell } from '../shared/WizardShell';
import { ManagersPanoramaStep } from './ManagersPanoramaStep';
import { ManagersCrossIssuesStep } from './ManagersCrossIssuesStep';
import { ManagersAdjustmentsStep } from './ManagersAdjustmentsStep';
import { WIZARD_CONFIGS, type AreaOkrSummary, type CrossDependency } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface ManagersCheckinWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 'panorama' | 'cross-issues' | 'adjustments';

// ============================================================
// COMPONENT
// ============================================================

export function ManagersCheckinWizard({ 
  open, 
  onOpenChange,
}: ManagersCheckinWizardProps) {
  const config = WIZARD_CONFIGS['managers-checkin'];
  
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('panorama');
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

  // Step index
  const stepIndex = useMemo(() => {
    switch (currentStep) {
      case 'panorama': return 0;
      case 'cross-issues': return 1;
      case 'adjustments': return 2;
      default: return 0;
    }
  }, [currentStep]);

  // Handlers
  const handleClose = useCallback(() => {
    setCurrentStep('panorama');
    setAdjustments([]);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleComplete = useCallback(() => {
    toast.success('Check-in de gestores concluído!');
    handleClose();
  }, [handleClose]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'panorama':
        return (
          <ManagersPanoramaStep
            areas={areas}
            companyProgress={companyProgress}
            onContinue={() => setCurrentStep('cross-issues')}
          />
        );

      case 'cross-issues':
        return (
          <ManagersCrossIssuesStep
            dependencies={dependencies}
            onContinue={() => setCurrentStep('adjustments')}
            onBack={() => setCurrentStep('panorama')}
          />
        );

      case 'adjustments':
        return (
          <ManagersAdjustmentsStep
            adjustments={adjustments}
            onAdjustmentsChange={setAdjustments}
            onComplete={handleComplete}
            onBack={() => setCurrentStep('cross-issues')}
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
