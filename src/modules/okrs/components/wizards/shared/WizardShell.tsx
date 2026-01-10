/**
 * WizardShell - Container comum para todos os wizards de check-in
 * 
 * Fornece:
 * - Header com título e progresso
 * - Indicadores de etapas
 * - Navegação básica
 * - Suporte a fechamento
 */

import { ReactNode, useMemo } from 'react';
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
  X,
  CheckCircle2,
  Rocket,
  ClipboardList,
  Target,
  BarChart3,
  Users,
  Lightbulb,
  Settings2,
  TrendingUp,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardPersona, WizardStepConfig } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface WizardShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: WizardPersona;
  title: string;
  subtitle?: string;
  steps: WizardStepConfig[];
  currentStepIndex: number;
  children: ReactNode;
  onClose?: () => void;
}

// Icon mapping for wizard personas
const PERSONA_ICONS: Record<WizardPersona, typeof Rocket> = {
  'collaborator': Calendar,
  'leader-prep': Settings2,
  'team-checkin': Users,
  'managers-checkin': TrendingUp,
  'clevel-checkin': Lightbulb,
};

// Icon mapping for step IDs
const STEP_ICONS: Record<string, typeof Rocket> = {
  // Collaborator
  'context': Rocket,
  'checkin': Target,
  'initiatives': ClipboardList,
  'reflection': MessageSquare,
  // Leader
  'overview': BarChart3,
  'highlights': Lightbulb,
  'preparation': ClipboardList,
  'alignment': TrendingUp,
  // Team
  'opening': Rocket,
  'kr-review': Target,
  'decisions': CheckCircle2,
  // Managers
  'panorama': BarChart3,
  'cross-issues': Users,
  'adjustments': Settings2,
  // C-Level
  'company-okrs': Target,
  'insights': Lightbulb,
  'directives': MessageSquare,
};

// ============================================================
// COMPONENT
// ============================================================

export function WizardShell({
  open,
  onOpenChange,
  persona,
  title,
  subtitle,
  steps,
  currentStepIndex,
  children,
  onClose,
}: WizardShellProps) {
  const PersonaIcon = PERSONA_ICONS[persona];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const currentStep = steps[currentStepIndex];

  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col [&>button]:hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <PersonaIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg">{title}</SheetTitle>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {subtitle}
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
              <span>Passo {currentStepIndex + 1} de {steps.length}</span>
              <span>{currentStep?.label}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            
            {/* Step indicators */}
            <div className="flex items-center justify-between pt-2">
              {steps.map((step, index) => {
                const StepIcon = STEP_ICONS[step.id] || Target;
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                
                return (
                  <div 
                    key={step.id}
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
                      <StepIcon className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{step.shortLabel}</span>
                    {step.optional && !isCompleted && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Opcional
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SheetHeader>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
