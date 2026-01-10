/**
 * CLevelCheckinWizard - Wizard de Check-in Estratégico C-Level (Wizard 5)
 * 
 * Simplificado para MVP - 4 etapas de direção estratégica
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { WizardShell } from '../shared/WizardShell';
import { ArrowRight, ArrowLeft, Target, Lightbulb, CheckCircle2, TrendingUp } from 'lucide-react';
import { useWizardSession } from '@/modules/okrs/hooks/useWizardSession';
import { WIZARD_CONFIGS } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface CLevelCheckinWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 'company-okrs' | 'insights' | 'decisions' | 'directives';

// ============================================================
// COMPONENT
// ============================================================

export function CLevelCheckinWizard({ open, onOpenChange }: CLevelCheckinWizardProps) {
  const config = WIZARD_CONFIGS['clevel-checkin'];
  
  // Session persistence
  const { createSession, completeSession, isCreating } = useWizardSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('company-okrs');
  const [strategicDecisions, setStrategicDecisions] = useState('');
  const [directives, setDirectives] = useState('');

  // Mock company OKRs
  const companyOkrs = useMemo(() => [
    { id: '1', title: 'Crescer receita em 30%', progress: 65, trend: 'improving' as const },
    { id: '2', title: 'NPS acima de 70', progress: 48, trend: 'stable' as const },
    { id: '3', title: 'Reduzir churn para 3%', progress: 72, trend: 'improving' as const },
  ], []);

  const stepIndex = useMemo(() => {
    const steps: WizardStep[] = ['company-okrs', 'insights', 'decisions', 'directives'];
    return steps.indexOf(currentStep);
  }, [currentStep]);

  // Create session when wizard opens
  useEffect(() => {
    if (open && !sessionId && !isCreating) {
      createSession({
        wizardType: 'clevel-checkin',
      }).then(session => {
        setSessionId(session.id);
      }).catch(err => {
        console.error('Failed to create wizard session:', err);
      });
    }
  }, [open, sessionId, isCreating, createSession]);

  const handleClose = useCallback(() => {
    setCurrentStep('company-okrs');
    setStrategicDecisions('');
    setDirectives('');
    setSessionId(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleComplete = useCallback(async () => {
    // Complete session with decisions and directives
    if (sessionId) {
      await completeSession({
        sessionId,
        meetingNotes: `Decisões: ${strategicDecisions}\n\nDirecionamentos: ${directives}`,
      }).catch(err => console.error('Failed to complete session:', err));
    }
    
    toast.success('Check-in estratégico concluído!');
    handleClose();
  }, [sessionId, completeSession, strategicDecisions, directives, handleClose]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'company-okrs':
        return (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Target className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">OKRs da Empresa</h3>
                  <p className="text-sm text-muted-foreground">Visão estratégica consolidada</p>
                </div>
              </div>
            </div>
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
            <div className="px-6 py-4 border-t">
              <Button onClick={() => setCurrentStep('insights')} className="w-full">
                Ver insights <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'insights':
        return (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Leitura do Sistema</h3>
                  <p className="text-sm text-muted-foreground">Insights automáticos</p>
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-3">
                <Card className="border-green-200"><CardContent className="p-4 text-sm">✓ 2 de 3 OKRs em tendência de melhora</CardContent></Card>
                <Card className="border-yellow-200"><CardContent className="p-4 text-sm">⚠ NPS estagnado - requer atenção</CardContent></Card>
                <Card><CardContent className="p-4 text-sm">💡 Engenharia é gargalo para 2 áreas</CardContent></Card>
              </div>
            </ScrollArea>
            <div className="px-6 py-4 border-t flex gap-3">
              <Button variant="ghost" onClick={() => setCurrentStep('company-okrs')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
              <Button onClick={() => setCurrentStep('decisions')} className="flex-1">Decisões <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
        );

      case 'decisions':
        return (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b"><h3 className="font-semibold text-lg">Decisões Estratégicas</h3></div>
            <div className="flex-1 p-6">
              <Textarea value={strategicDecisions} onChange={(e) => setStrategicDecisions(e.target.value)} placeholder="Registre decisões tomadas..." className="min-h-[200px]" />
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <Button variant="ghost" onClick={() => setCurrentStep('insights')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
              <Button onClick={() => setCurrentStep('directives')} className="flex-1">Direcionamentos <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
        );

      case 'directives':
        return (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b"><h3 className="font-semibold text-lg">Direcionamentos</h3></div>
            <div className="flex-1 p-6">
              <Textarea value={directives} onChange={(e) => setDirectives(e.target.value)} placeholder="Direcionamentos para as áreas..." className="min-h-[200px]" />
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <Button variant="ghost" onClick={() => setCurrentStep('decisions')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
              <Button onClick={handleComplete} className="flex-1"><CheckCircle2 className="h-4 w-4 mr-2" />Concluir</Button>
            </div>
          </div>
        );
    }
  };

  return (
    <WizardShell open={open} onOpenChange={onOpenChange} persona="clevel-checkin" title={config.title} subtitle={config.description} steps={config.steps} currentStepIndex={stepIndex} onClose={handleClose}>
      {renderStepContent()}
    </WizardShell>
  );
}
