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

// ============================================================
// LAST STEP FOOTER — confirmação canônica via ConfirmDialog
// ============================================================

export interface WizardLastStepFooterProps
  extends Omit<WizardStepFooterProps, 'primaryLabel' | 'primaryVariant'> {
  /** Label do botão primário (default: "Finalizar e enviar") */
  primaryLabel?: string;
  /** Título do modal de confirmação (default: "Concluir ritual") */
  confirmTitle?: string;
  /** Descrição do modal — string ou JSX */
  confirmDescription?: ReactNode;
  /** Label do botão de confirmar dentro do modal (default: "Confirmar conclusão") */
  confirmLabel?: string;
  /** Label do botão de cancelar (default: "Cancelar") */
  cancelLabel?: string;
  /** Variante visual do modal (default: "info") */
  confirmVariant?: ConfirmDialogVariant;
  /** Desabilita totalmente a confirmação (uso excepcional). Default: false. */
  disableConfirmation?: boolean;
}

const DEFAULT_CONFIRM_DESCRIPTION =
  'Ao confirmar, os dados serão salvos e o ritual será marcado como concluído. Tem certeza de que deseja prosseguir?';

/** Footer for last step (complete button) with canonical confirmation modal */
export function WizardLastStepFooter({
  primaryLabel,
  confirmTitle = 'Concluir ritual',
  confirmDescription = DEFAULT_CONFIRM_DESCRIPTION,
  confirmLabel = 'Confirmar conclusão',
  cancelLabel = 'Cancelar',
  confirmVariant = 'info',
  disableConfirmation = false,
  ...props
}: WizardLastStepFooterProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const resolvedPrimaryLabel =
    primaryLabel ?? (props.primaryLoading ? 'Enviando…' : 'Finalizar e enviar');

  const handlePrimaryClick = () => {
    if (disableConfirmation) {
      props.onPrimary?.();
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    await props.onPrimary?.();
    // Mantém o modal aberto durante isLoading; o pai controla o desmount via navegação.
    if (!props.primaryLoading) setShowConfirm(false);
  };

  return (
    <>
      <WizardStepFooter
        {...props}
        primaryLabel={resolvedPrimaryLabel}
        primaryVariant="success"
        onPrimary={handlePrimaryClick}
      />

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={(open) => {
          if (props.primaryLoading) return; // bloqueia fechar enquanto envia
          setShowConfirm(open);
        }}
        onConfirm={handleConfirm}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        variant={confirmVariant}
        isLoading={!!props.primaryLoading}
      />
    </>
  );
}

/** Footer for optional step (with skip button) */
export function WizardOptionalStepFooter(props: Omit<WizardStepFooterProps, 'showSkip'>) {
  return <WizardStepFooter {...props} showSkip />;
}
