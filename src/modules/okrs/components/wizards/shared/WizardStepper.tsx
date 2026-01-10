/**
 * WizardStepper - Stepper vertical para Full-Page Wizard
 * 
 * Mostra progresso visual das etapas do wizard.
 * Permite navegação entre steps já completados.
 */

import { cn } from '@/lib/utils';
import { Check, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================
// TYPES
// ============================================================

export interface WizardStepDefinition {
  id: string;
  label: string;
  description?: string;
}

export interface WizardStepperProps {
  steps: WizardStepDefinition[];
  currentStepId: string;
  completedSteps: string[];
  onStepClick?: (stepId: string) => void;
  isLoading?: boolean;
  className?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function WizardStepper({
  steps,
  currentStepId,
  completedSteps,
  onStepClick,
  isLoading = false,
  className,
}: WizardStepperProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStepId);
  
  return (
    <nav 
      className={cn('flex flex-col gap-1', className)}
      aria-label="Progresso do wizard"
    >
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStepId;
        const isClickable = isCompleted || index <= currentIndex;
        const isPast = index < currentIndex;
        
        return (
          <div key={step.id} className="relative">
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'absolute left-4 top-10 w-0.5 h-6 transition-colors',
                  isPast || isCompleted ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full justify-start gap-3 h-auto py-2 px-2 font-normal',
                isCurrent && 'bg-primary/10 text-primary font-medium',
                !isClickable && 'opacity-50 cursor-not-allowed',
                isClickable && !isCurrent && 'hover:bg-muted'
              )}
              onClick={() => {
                if (isClickable && onStepClick && !isLoading) {
                  onStepClick(step.id);
                }
              }}
              disabled={!isClickable || isLoading}
            >
              {/* Step indicator */}
              <div
                className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs shrink-0 transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && !isCompleted && 'border-2 border-primary text-primary bg-background',
                  !isCurrent && !isCompleted && 'border border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isLoading && isCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isCompleted ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              
              {/* Step label */}
              <div className="flex flex-col items-start text-left min-w-0">
                <span className={cn(
                  'text-sm truncate',
                  isCurrent && 'font-medium',
                  !isCurrent && !isCompleted && 'text-muted-foreground'
                )}>
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </span>
                )}
              </div>
            </Button>
          </div>
        );
      })}
    </nav>
  );
}

// ============================================================
// COMPACT VARIANT (for mobile)
// ============================================================

export function WizardStepperCompact({
  steps,
  currentStepId,
  completedSteps,
  className,
}: Omit<WizardStepperProps, 'onStepClick' | 'isLoading'>) {
  const currentIndex = steps.findIndex(s => s.id === currentStepId);
  const progress = ((currentIndex + 1) / steps.length) * 100;
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Current step indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {steps[currentIndex]?.label || 'Carregando...'}
        </span>
        <span className="text-muted-foreground">
          {currentIndex + 1} de {steps.length}
        </span>
      </div>
    </div>
  );
}
