/**
 * CLevelCheckinWizard - Wizard de Check-in Estratégico C-Level (Wizard 5)
 * 
 * Refatorado para usar useWizardOrchestrator e componentes compartilhados
 * 
 * Fluxo:
 * 1. Company OKRs - Visão estratégica
 * 2. Insights - Leitura do sistema
 * 3. Decisions - Decisões estratégicas
 * 4. Directives - Direcionamentos
 */

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { WizardShell } from '../shared/WizardShell';
import { WizardStepHeader } from '../shared/WizardStepHeader';
import { WizardStepFooter, WizardFirstStepFooter, WizardLastStepFooter } from '../shared/WizardStepFooter';
import { Target, Lightbulb, TrendingUp } from 'lucide-react';
import { useWizardOrchestrator } from '@/modules/okrs/hooks/useWizardOrchestrator';
import { WIZARD_CONFIGS } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface CLevelCheckinWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ['company-okrs', 'insights', 'decisions', 'directives'] as const;
type WizardStep = typeof STEPS[number];

// ============================================================
// COMPONENT
// ============================================================

export function CLevelCheckinWizard({ open, onOpenChange }: CLevelCheckinWizardProps) {
  const config = WIZARD_CONFIGS['clevel-checkin'];
  
  // Orchestrator handles session + navigation
  const {
    currentStep,
    stepIndex,
    goToStep,
    goNext,
    goBack,
    handleClose,
    completeWizard,
  } = useWizardOrchestrator<WizardStep>({
    wizardType: 'clevel-checkin',
    steps: STEPS,
    open,
    onOpenChange,
    skipCycleFetch: true,
  });
  
  // Local state
  const [strategicDecisions, setStrategicDecisions] = useState('');
  const [directives, setDirectives] = useState('');

  // Mock company OKRs
  const companyOkrs = useMemo(() => [
    { id: '1', title: 'Crescer receita em 30%', progress: 65, trend: 'improving' as const },
    { id: '2', title: 'NPS acima de 70', progress: 48, trend: 'stable' as const },
    { id: '3', title: 'Reduzir churn para 3%', progress: 72, trend: 'improving' as const },
  ], []);

  const handleComplete = useCallback(async () => {
    await completeWizard({
      meetingNotes: `Decisões: ${strategicDecisions}\n\nDirecionamentos: ${directives}`,
    });
    
    toast.success('Check-in estratégico concluído!');
    handleClose();
  }, [completeWizard, strategicDecisions, directives, handleClose]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'company-okrs':
        return (
          <div className="flex flex-col h-full">
            <WizardStepHeader
              icon={Target}
              title="OKRs da Empresa"
              description="Visão estratégica consolidada"
              variant="amber"
            />
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {companyOkrs.map((okr) => (
                  <Card key={okr.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{okr.title}</p>
                        <Badge variant="secondary" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {okr.progress}%
                        </Badge>
                      </div>
                      <Progress value={okr.progress} className="h-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <WizardFirstStepFooter
              primaryLabel="Ver insights"
              onPrimary={goNext}
            />
          </div>
        );

      case 'insights':
        return (
          <div className="flex flex-col h-full">
            <WizardStepHeader
              icon={Lightbulb}
              title="Leitura do Sistema"
              description="Insights automáticos"
              variant="primary"
            />
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-3">
                <Card className="border-green-200">
                  <CardContent className="p-4 text-sm">✓ 2 de 3 OKRs em tendência de melhora</CardContent>
                </Card>
                <Card className="border-yellow-200">
                  <CardContent className="p-4 text-sm">⚠ NPS estagnado - requer atenção</CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-sm">💡 Engenharia é gargalo para 2 áreas</CardContent>
                </Card>
              </div>
            </ScrollArea>
            <WizardStepFooter
              onBack={goBack}
              primaryLabel="Decisões"
              onPrimary={goNext}
            />
          </div>
        );

      case 'decisions':
        return (
          <div className="flex flex-col h-full">
            <WizardStepHeader
              icon={Target}
              title="Decisões Estratégicas"
              description="Registre as decisões tomadas"
              variant="default"
            />
            <div className="flex-1 p-6">
              <Textarea 
                value={strategicDecisions} 
                onChange={(e) => setStrategicDecisions(e.target.value)} 
                placeholder="Registre decisões tomadas..." 
                className="min-h-[200px]" 
              />
            </div>
            <WizardStepFooter
              onBack={goBack}
              primaryLabel="Direcionamentos"
              onPrimary={goNext}
            />
          </div>
        );

      case 'directives':
        return (
          <div className="flex flex-col h-full">
            <WizardStepHeader
              icon={Target}
              title="Direcionamentos"
              description="Direcionamentos para as áreas"
              variant="default"
            />
            <div className="flex-1 p-6">
              <Textarea 
                value={directives} 
                onChange={(e) => setDirectives(e.target.value)} 
                placeholder="Direcionamentos para as áreas..." 
                className="min-h-[200px]" 
              />
            </div>
            <WizardLastStepFooter
              onBack={goBack}
              onPrimary={handleComplete}
            />
          </div>
        );
    }
  };

  return (
    <WizardShell 
      open={open} 
      onOpenChange={onOpenChange} 
      persona="clevel-checkin" 
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
