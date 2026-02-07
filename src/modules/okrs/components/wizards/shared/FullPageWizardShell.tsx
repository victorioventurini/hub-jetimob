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
import { DiscardChangesDialog } from '@/components/ui/discard-changes-dialog';
import { ArrowLeft, X, Save, Loader2 } from 'lucide-react';
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
  /** Se está salvando rascunho */
  isSavingDraft?: boolean;
  /** Callback para salvar rascunho */
  onSaveDraft?: () => Promise<void>;
  /** Última vez que foi salvo */
  lastSavedAt?: string | null;
  /** Se está continuando um rascunho */
  isResumingDraft?: boolean;
  /** Callback para descartar rascunho e começar novo */
  onDiscardDraft?: () => Promise<void>;
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
  /** Componente de seletor de contexto para admin (time/usuário) */
  adminContextSwitcher?: React.ReactNode;
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
  isSavingDraft = false,
  onSaveDraft,
  lastSavedAt,
  isResumingDraft = false,
  onDiscardDraft,
  isLoading = false,
  onClose,
  backUrl = '/wizards',
  children,
  contextLabel,
  adminContextSwitcher,
  className,
}: FullPageWizardShellProps) {
  const navigate = useNavigate();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(isResumingDraft);
  
  // Update banner visibility when isResumingDraft changes
  useEffect(() => {
    if (isResumingDraft) {
      setShowDraftBanner(true);
    }
  }, [isResumingDraft]);
  
  // Format last saved time
  const formatLastSaved = (date: string | null | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date for banner
  const formatDraftDate = (date: string | null | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} às ${time}`;
  };
  
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
  
  // Handle save draft
  const handleSaveDraft = useCallback(async () => {
    if (!onSaveDraft) return;
    setIsSaving(true);
    try {
      await onSaveDraft();
    } finally {
      setIsSaving(false);
    }
  }, [onSaveDraft]);
  
  // Handle discard draft
  const handleDiscardDraft = useCallback(async () => {
    if (!onDiscardDraft) return;
    setIsDiscarding(true);
    try {
      await onDiscardDraft();
      setShowDraftBanner(false);
    } finally {
      setIsDiscarding(false);
    }
  }, [onDiscardDraft]);
  
  // Dismiss banner (just hides it, doesn't discard)
  const handleDismissBanner = useCallback(() => {
    setShowDraftBanner(false);
  }, []);
  
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
              {/* Admin context switcher (team/user selector) */}
              {adminContextSwitcher}
              {/* Fallback to contextLabel if no switcher */}
              {!adminContextSwitcher && contextLabel && (
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
          
          {/* Save draft button */}
          {onSaveDraft && (
            <div className="flex items-center gap-2">
              {lastSavedAt && !isDirty && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Salvo às {formatLastSaved(lastSavedAt)}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={!isDirty}
                isLoading={isSaving || isSavingDraft}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Salvar rascunho</span>
              </Button>
            </div>
          )}
          
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
      
      {/* Draft resuming banner */}
      {showDraftBanner && isResumingDraft && (
        <div className="bg-muted border-b">
          <div className="container py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">📝</span>
              <span>
                Continuando rascunho salvo
                {lastSavedAt && (
                  <span className="text-muted-foreground"> em {formatDraftDate(lastSavedAt)}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onDiscardDraft && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscardDraft}
                  disabled={isDiscarding}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
                >
                  {isDiscarding ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Descartar e começar novo
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismissBanner}
                className="h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
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
      <DiscardChangesDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onContinueEditing={handleCancelExit}
        onDiscardAndExit={handleConfirmExit}
      />
    </div>
  );
}
