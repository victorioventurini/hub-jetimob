/**
 * WizardStepFooter - Footer reutilizável para steps de wizard
 * 
 * Elimina duplicação de padrões de navegação:
 * - Botão Voltar (ghost)
 * - Botão de ação principal (primário)
 * - Botão de pular (opcional)
 * - Loading states
 */

import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, SkipForward, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog, type ConfirmDialogVariant } from '@/components/ui/confirm-dialog';

// ============================================================
// TYPES
// ============================================================

export interface WizardStepFooterProps {
  /** Show back button */
  showBack?: boolean;
  /** Back button label */
  backLabel?: string;
  /** Back button handler */
  onBack?: () => void;
  /** Back button disabled */
  backDisabled?: boolean;
  
  /** Primary action label */
  primaryLabel?: string;
  /** Primary action handler */
  onPrimary?: () => void;
  /** Primary button disabled */
  primaryDisabled?: boolean;
  /** Primary button loading */
  primaryLoading?: boolean;
  /** Primary button variant */
  primaryVariant?: 'default' | 'success';
  /** Hide primary button */
  hidePrimary?: boolean;
  
  /** Show skip button */
  showSkip?: boolean;
  /** Skip button label */
  skipLabel?: string;
  /** Skip button handler */
  onSkip?: () => void;
  
  /** Custom left content (replaces back button) */
  leftContent?: ReactNode;
  /** Custom right content (replaces primary button) */
  rightContent?: ReactNode;
  
  /** Additional class for container */
  className?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function WizardStepFooter({
  showBack = true,
  backLabel = 'Voltar',
  onBack,
  backDisabled = false,
  
  primaryLabel = 'Continuar',
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
  primaryVariant = 'default',
  hidePrimary = false,
  
  showSkip = false,
  skipLabel = 'Pular',
  onSkip,
  
  leftContent,
  rightContent,
  
  className,
}: WizardStepFooterProps) {
  const PrimaryIcon = primaryVariant === 'success' ? CheckCircle2 : ArrowRight;
  
  return (
    <div className={cn(
      'shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t bg-background/95 backdrop-blur',
      'flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 min-w-0 overflow-x-hidden',
      'pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4',
      className
    )}>
      {/* Left side */}
      <div className="flex items-center gap-2 min-w-0 sm:shrink-0 flex-wrap">
        {leftContent ?? (
          showBack && onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={backDisabled}
              className="min-w-0 max-w-full w-full sm:w-auto h-11 sm:h-10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="truncate">{backLabel}</span>
            </Button>
          )
        )}
      </div>

      {/* Right side — ocupa largura restante para o Continuar dominar o rodapé */}
      <div className="flex items-center gap-2 min-w-0 max-w-full flex-wrap sm:flex-nowrap sm:flex-1 sm:justify-end">
        {showSkip && onSkip && (
          <Button
            variant="outline"
            onClick={onSkip}
            className="min-w-0 max-w-full w-full sm:w-auto sm:shrink-0 h-11 sm:h-10"
          >
            <SkipForward className="h-4 w-4 mr-1" />
            <span className="truncate">{skipLabel}</span>
          </Button>
        )}

        {rightContent ?? (
          !hidePrimary && onPrimary && (
            <Button
              onClick={onPrimary}
              disabled={primaryDisabled || primaryLoading}
              isLoading={primaryLoading}
              className={cn(
                'min-w-0 max-w-full w-full sm:flex-1 h-11 sm:h-10',
                primaryVariant === 'success' && 'bg-success text-success-foreground hover:bg-success/90'
              )}
            >
              {!primaryLoading && <PrimaryIcon className="h-4 w-4 mr-2" />}
              <span className="truncate">{primaryLabel}</span>
            </Button>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// PRESET FOOTERS
// ============================================================

/** Footer for first step (no back button) — copy default "Começar" */
export function WizardFirstStepFooter(props: Omit<WizardStepFooterProps, 'showBack'>) {
  return <WizardStepFooter primaryLabel="Começar" {...props} showBack={false} />;
}

/** Footer for last step (complete button) with confirmation dialog */
export function WizardLastStepFooter(props: Omit<WizardStepFooterProps, 'primaryLabel' | 'primaryVariant'>) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePrimaryClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    props.onPrimary?.();
  };

  return (
    <>
      <WizardStepFooter 
        {...props} 
        primaryLabel={props.primaryLoading ? 'Enviando…' : 'Finalizar e enviar'} 
        primaryVariant="success"
        onPrimary={handlePrimaryClick}
      />

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir ritual</AlertDialogTitle>
            <AlertDialogDescription>
              Ao confirmar, os dados serão salvos e o ritual será marcado como concluído. 
              Tem certeza de que deseja prosseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Footer for optional step (with skip button) */
export function WizardOptionalStepFooter(props: Omit<WizardStepFooterProps, 'showSkip'>) {
  return <WizardStepFooter {...props} showSkip />;
}
