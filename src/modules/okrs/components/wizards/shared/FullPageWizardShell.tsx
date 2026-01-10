/**
 * FullPageWizardShell - Container de página inteira para wizards complexos
 * 
 * Substitui o WizardShell baseado em Sheet para wizards com:
 * - Muitos passos (5+)
 * - Operações pesadas (IA, queries)
 * - Dados críticos que não podem ser perdidos
 * 
 * Features:
 * - Stepper lateral com navegação
 * - Persistência via URL e localStorage
 * - Guard de saída (unsaved changes)
 * - Layout responsivo (stepper lateral → topo mobile)
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { ArrowLeft, X } from 'lucide-react';
import { WizardStepper, WizardStepperCompact, type WizardStepDefinition } from './WizardStepper';

// ============================================================
// TYPES
// ============================================================

export interface FullPageWizardShellProps {
  /** Título do wizard */
  title: string;
  /** Subtítulo opcional */
  subtitle?: string;
  /** Definições dos passos */
  steps: WizardStepDefinition[];
  /** ID do passo atual */
  currentStepId: string;
  /** Lista de IDs de passos completados */
  completedSteps: string[];
  /** Callback quando muda de passo via stepper */
  onStepChange?: (stepId: string) => void;
  /** Se há alterações não salvas */
  isDirty?: boolean;
  /** Se está carregando algo */
  isLoading?: boolean;
  /** Callback ao fechar/cancelar */
  onClose: () => void;
  /** URL para voltar (default: /wizards) */
  backUrl?: string;
  /** Conteúdo do passo atual */
  children: React.ReactNode;
  /** Contexto adicional (nome do time, etc) */
  contextLabel?: string;
  /** Classe extra para o container */
  className?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function FullPageWizardShell({
  title,
  subtitle,
  steps,
  currentStepId,
  completedSteps,
  onStepChange,
  isDirty = false,
  isLoading = false,
  onClose,
  backUrl = '/wizards',
  children,
  contextLabel,
  className,
}: FullPageWizardShellProps) {
  const navigate = useNavigate();
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  // Warn before closing tab/window if dirty
  useEffect(() => {
    if (!isDirty) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
  
  // Handle close with dirty check
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowExitDialog(true);
    } else {
      onClose();
      navigate(backUrl);
    }
  }, [isDirty, onClose, navigate, backUrl]);
  
  // Confirm exit
  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    onClose();
    navigate(backUrl);
  }, [onClose, navigate, backUrl]);
  
  // Cancel exit
  const handleCancelExit = useCallback(() => {
    setShowExitDialog(false);
  }, []);
  
  return (
    <div className={cn('min-h-screen bg-background flex flex-col', className)}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              {contextLabel && (
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  — {contextLabel}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate hidden md:block">
                {subtitle}
              </p>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
        
        {/* Mobile stepper */}
        <div className="container pb-3 lg:hidden">
          <WizardStepperCompact
            steps={steps}
            currentStepId={currentStepId}
            completedSteps={completedSteps}
          />
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 container py-6">
        <div className="flex gap-8">
          {/* Desktop stepper - lateral */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-20">
              <WizardStepper
                steps={steps}
                currentStepId={currentStepId}
                completedSteps={completedSteps}
                onStepClick={onStepChange}
                isLoading={isLoading}
              />
            </div>
          </aside>
          
          {/* Step content */}
          <main className="flex-1 min-w-0">
            <ScrollArea className="h-full">
              {children}
            </ScrollArea>
          </main>
        </div>
      </div>
      
      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Se sair agora, todo o progresso será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelExit}>
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar e sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
