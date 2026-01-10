/**
 * CheckinWizard - Wizard de check-in em grupo para rituais de time
 * 
 * Modal full-screen com 4 passos:
 * 1. Setup - Seleção de ciclo e time
 * 2. Seleção - Escolha de KRs para check-in
 * 3. Check-in - Registro sequencial de cada KR
 * 4. Resumo - Resultado da reunião
 * 
 * RBAC: Respeita get_okr_manageable_team_ids
 * IDENTITY: Usa profile_id
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  X,
  ClipboardList,
  Target,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { WizardSetup } from './wizard/WizardSetup';
import { WizardKrSelection } from './wizard/WizardKrSelection';
import { WizardCheckinStep } from './wizard/WizardCheckinStep';
import { WizardSummary } from './wizard/WizardSummary';
import { WizardKr } from '../hooks/useTeamPendingKrs';

// ============================================================
// TYPES
// ============================================================

export interface CheckinWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCycleId?: string;
  initialTeamId?: string;
}

type WizardStep = 'setup' | 'selection' | 'checkin' | 'summary';

interface CheckinResult {
  krId: string;
  krTitle: string;
  previousValue: number;
  newValue: number;
  confidence: 'high' | 'medium' | 'low';
  skipped: boolean;
  blocker?: string;
}

const STEPS: WizardStep[] = ['setup', 'selection', 'checkin', 'summary'];

const STEP_CONFIG: Record<WizardStep, { icon: typeof Rocket; label: string; shortLabel: string }> = {
  setup: { icon: Rocket, label: 'Configuração', shortLabel: 'Setup' },
  selection: { icon: ClipboardList, label: 'Seleção de KRs', shortLabel: 'Seleção' },
  checkin: { icon: Target, label: 'Check-in', shortLabel: 'Check-in' },
  summary: { icon: BarChart3, label: 'Resumo', shortLabel: 'Resumo' },
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CheckinWizard({ 
  open, 
  onOpenChange, 
  initialCycleId,
  initialTeamId,
}: CheckinWizardProps) {
  const navigate = useNavigate();
  
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('setup');
  const [cycleId, setCycleId] = useState<string | null>(initialCycleId || null);
  const [cycleName, setCycleName] = useState<string>('');
  const [teamIds, setTeamIds] = useState<string[]>(initialTeamId ? [initialTeamId] : []);
  const [teamName, setTeamName] = useState<string>('');
  const [selectedKrs, setSelectedKrs] = useState<WizardKr[]>([]);
  const [currentKrIndex, setCurrentKrIndex] = useState(0);
  const [results, setResults] = useState<CheckinResult[]>([]);

  // Computed
  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const currentKr = selectedKrs[currentKrIndex];

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setCurrentStep('setup');
    setCycleId(initialCycleId || null);
    setCycleName('');
    setTeamIds(initialTeamId ? [initialTeamId] : []);
    setTeamName('');
    setSelectedKrs([]);
    setCurrentKrIndex(0);
    setResults([]);
  }, [initialCycleId, initialTeamId]);

  // Handle close
  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(resetWizard, 300);
  }, [onOpenChange, resetWizard]);

  // Navigate steps
  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const goBack = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [stepIndex]);

  // Setup complete handler
  const handleSetupComplete = useCallback((
    selectedCycleId: string,
    selectedCycleName: string,
    selectedTeamIds: string[],
    selectedTeamName: string
  ) => {
    setCycleId(selectedCycleId);
    setCycleName(selectedCycleName);
    setTeamIds(selectedTeamIds);
    setTeamName(selectedTeamName);
    goToStep('selection');
  }, [goToStep]);

  // Selection complete handler
  const handleSelectionComplete = useCallback((krs: WizardKr[]) => {
    setSelectedKrs(krs);
    setCurrentKrIndex(0);
    setResults([]);
    goToStep('checkin');
  }, [goToStep]);

  // Check-in complete handler
  const handleCheckinComplete = useCallback((result: CheckinResult) => {
    setResults(prev => [...prev, result]);
    
    // Move to next KR or summary
    if (currentKrIndex < selectedKrs.length - 1) {
      setCurrentKrIndex(prev => prev + 1);
    } else {
      goToStep('summary');
    }
  }, [currentKrIndex, selectedKrs.length, goToStep]);

  // Skip KR handler
  const handleSkipKr = useCallback(() => {
    if (!currentKr) return;
    
    const result: CheckinResult = {
      krId: currentKr.id,
      krTitle: currentKr.title,
      previousValue: currentKr.current_value,
      newValue: currentKr.current_value,
      confidence: 'medium',
      skipped: true,
    };
    
    handleCheckinComplete(result);
  }, [currentKr, handleCheckinComplete]);

  // Summary actions
  const handleViewCycleCheckins = useCallback(() => {
    handleClose();
    const params = new URLSearchParams();
    if (cycleId) params.set('cycle_id', cycleId);
    if (teamIds.length === 1) params.set('team_id', teamIds[0]);
    navigate(`/okrs/checkins?${params.toString()}`);
  }, [cycleId, teamIds, navigate, handleClose]);

  const handleCopySummary = useCallback(() => {
    const completed = results.filter(r => !r.skipped);
    const skipped = results.filter(r => r.skipped);
    const blockers = results.filter(r => r.blocker);
    
    const summary = `
# Resumo do Check-in — ${teamName}
**Ciclo:** ${cycleName}
**Data:** ${new Date().toLocaleDateString('pt-BR')}

## Resultados
- ✅ ${completed.length} check-ins realizados
- ⏭️ ${skipped.length} KRs pulados
- 🚧 ${blockers.length} bloqueadores registrados

## KRs atualizados
${completed.map(r => `- ${r.krTitle}: ${r.previousValue} → ${r.newValue}`).join('\n')}

${blockers.length > 0 ? `## Bloqueadores\n${blockers.map(r => `- ${r.krTitle}: ${r.blocker}`).join('\n')}` : ''}
`.trim();

    navigator.clipboard.writeText(summary);
  }, [results, teamName, cycleName]);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg">Check-in do Time</SheetTitle>
                {cycleName && teamName && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {teamName} • {cycleName}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Passo {stepIndex + 1} de {STEPS.length}</span>
              <span>{STEP_CONFIG[currentStep].label}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            
            {/* Step indicators */}
            <div className="flex items-center justify-between pt-2">
              {STEPS.map((step, index) => {
                const config = STEP_CONFIG[step];
                const Icon = config.icon;
                const isActive = step === currentStep;
                const isCompleted = index < stepIndex;
                
                return (
                  <div 
                    key={step}
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-colors",
                      isActive && "text-primary font-medium",
                      isCompleted && "text-green-600 dark:text-green-400",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{config.shortLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetHeader>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {currentStep === 'setup' && (
            <WizardSetup onComplete={handleSetupComplete} />
          )}
          
          {currentStep === 'selection' && cycleId && (
            <WizardKrSelection
              cycleId={cycleId}
              teamIds={teamIds}
              onComplete={handleSelectionComplete}
              onBack={goBack}
            />
          )}
          
          {currentStep === 'checkin' && currentKr && (
            <WizardCheckinStep
              kr={currentKr}
              currentIndex={currentKrIndex}
              totalCount={selectedKrs.length}
              onComplete={handleCheckinComplete}
              onSkip={handleSkipKr}
              onBack={goBack}
            />
          )}
          
          {currentStep === 'summary' && (
            <WizardSummary
              results={results}
              cycleName={cycleName}
              teamName={teamName}
              onViewCheckins={handleViewCycleCheckins}
              onCopySummary={handleCopySummary}
              onClose={handleClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
