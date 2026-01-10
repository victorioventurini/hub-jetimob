/**
 * CLevelCheckinPage - Full-page wizard para check-in estratégico C-Level
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { useGenericWizardDraft } from '@/modules/okrs/hooks/useGenericWizardDraft';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowRight, ArrowLeft, Target, Lightbulb, CheckCircle2, TrendingUp } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

type WizardStep = 'company-okrs' | 'insights' | 'decisions' | 'directives';

interface CLevelDraftData {
  strategicDecisions: string;
  directives: string;
  reviewedOkrs: string[];
}

const WIZARD_STEPS = [
  { id: 'company-okrs' as const, label: 'OKRs', description: 'Visão da empresa' },
  { id: 'insights' as const, label: 'Insights', description: 'Análise estratégica' },
  { id: 'decisions' as const, label: 'Decisões', description: 'Direcionamentos' },
  { id: 'directives' as const, label: 'Diretrizes', description: 'Comunicação' },
];

const STEP_ORDER: WizardStep[] = ['company-okrs', 'insights', 'decisions', 'directives'];

const DEFAULT_DATA: CLevelDraftData = {
  strategicDecisions: '',
  directives: '',
  reviewedOkrs: [],
};

// Mock company OKRs
const MOCK_OKRS = [
  { id: '1', title: 'Crescer receita em 30%', progress: 65, trend: 'improving' as const },
  { id: '2', title: 'NPS acima de 70', progress: 48, trend: 'stable' as const },
  { id: '3', title: 'Reduzir churn para 3%', progress: 72, trend: 'improving' as const },
];

// ============================================================
// STEP COMPONENTS
// ============================================================

function CompanyOkrsStep({ 
  okrs, 
  onContinue 
}: { 
  okrs: typeof MOCK_OKRS; 
  onContinue: () => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">OKRs da Empresa</h2>
        <p className="text-muted-foreground">Visão geral dos objetivos estratégicos</p>
      </div>
      
      <div className="space-y-4">
        {okrs.map(okr => (
          <Card key={okr.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">{okr.title}</span>
                </div>
                <Badge variant={okr.trend === 'improving' ? 'default' : 'secondary'}>
                  {okr.trend === 'improving' ? 'Melhorando' : 'Estável'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={okr.progress} className="flex-1" />
                <span className="text-sm font-medium">{okr.progress}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Button onClick={onContinue} className="gap-2">
          Continuar <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function InsightsStep({ 
  onContinue, 
  onBack 
}: { 
  onContinue: () => void; 
  onBack: () => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Insights Estratégicos</h2>
        <p className="text-muted-foreground">Pontos de atenção identificados</p>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium">NPS precisa de atenção</p>
              <p className="text-sm text-muted-foreground">
                O indicador está abaixo da meta e com tendência estável. 
                Recomenda-se revisar as iniciativas de satisfação do cliente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Receita em boa trajetória</p>
              <p className="text-sm text-muted-foreground">
                O OKR de receita está com tendência de melhoria. 
                Manter o foco nas ações atuais.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onContinue} className="gap-2">
          Continuar <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DecisionsStep({ 
  value, 
  onChange, 
  onContinue, 
  onBack 
}: { 
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void; 
  onBack: () => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Decisões Estratégicas</h2>
        <p className="text-muted-foreground">Registre os direcionamentos definidos</p>
      </div>
      
      <Textarea
        placeholder="Quais decisões foram tomadas neste check-in?"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
      />
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onContinue} className="gap-2">
          Continuar <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DirectivesStep({ 
  value, 
  onChange, 
  onComplete, 
  onBack 
}: { 
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void; 
  onBack: () => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Diretrizes para a Organização</h2>
        <p className="text-muted-foreground">Mensagem para comunicar aos times</p>
      </div>
      
      <Textarea
        placeholder="Quais diretrizes devem ser comunicadas?"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
      />
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onComplete} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> Concluir
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CLevelCheckinPage() {
  const navigate = useNavigate();
  
  usePageTitle('Check-in Estratégico');
  
  // Draft persistence
  const {
    draft,
    updateDraft,
    setStep,
    clearDraft,
    discardDraft,
    saveDraft,
    isDirty,
    isSaving,
    isResumingDraft,
    lastSavedAt,
  } = useGenericWizardDraft<WizardStep, CLevelDraftData>({
    wizardType: 'clevel-checkin',
    defaultStep: 'company-okrs',
    defaultData: DEFAULT_DATA,
  });
  
  // Navigation
  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    for (let i = 0; i < currentIdx; i++) {
      completed.push(STEP_ORDER[i]);
    }
    return completed;
  }, [draft.currentStep]);
  
  const goToStep = useCallback((stepId: string) => {
    setStep(stepId as WizardStep);
  }, [setStep]);
  
  const goNext = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIdx + 1]);
    }
  }, [draft.currentStep, setStep]);
  
  const goBack = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx > 0) {
      setStep(STEP_ORDER[currentIdx - 1]);
    }
  }, [draft.currentStep, setStep]);
  
  // Handlers
  const handleClose = useCallback(() => {
    clearDraft();
  }, [clearDraft]);
  
  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Erro ao salvar rascunho');
    }
  }, [saveDraft]);
  
  const handleDiscardDraft = useCallback(async () => {
    try {
      await discardDraft();
      toast.success('Rascunho descartado.');
    } catch (error) {
      console.error('Failed to discard draft:', error);
      toast.error('Erro ao descartar rascunho');
    }
  }, [discardDraft]);
  
  const handleComplete = useCallback(async () => {
    await clearDraft();
    toast.success('Check-in estratégico concluído!');
    navigate('/okrs');
  }, [clearDraft, navigate]);
  
  // Render step content
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'company-okrs':
        return <CompanyOkrsStep okrs={MOCK_OKRS} onContinue={goNext} />;
        
      case 'insights':
        return <InsightsStep onContinue={goNext} onBack={goBack} />;
        
      case 'decisions':
        return (
          <DecisionsStep
            value={draft.data.strategicDecisions}
            onChange={(v) => updateDraft({ strategicDecisions: v })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'directives':
        return (
          <DirectivesStep
            value={draft.data.directives}
            onChange={(v) => updateDraft({ directives: v })}
            onComplete={handleComplete}
            onBack={goBack}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <FullPageWizardShell
      title="Check-in Estratégico"
      subtitle="Visão estratégica e direcionamentos para a empresa"
      steps={WIZARD_STEPS.map(s => ({ id: s.id, label: s.label, description: s.description }))}
      currentStepId={draft.currentStep}
      completedSteps={completedSteps}
      onStepChange={goToStep}
      isDirty={isDirty}
      isSavingDraft={isSaving}
      onSaveDraft={handleSaveDraft}
      lastSavedAt={lastSavedAt}
      isResumingDraft={isResumingDraft}
      onDiscardDraft={handleDiscardDraft}
      onClose={handleClose}
      backUrl="/wizards"
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
