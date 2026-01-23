/**
 * WizardStepFooter - Footer reutilizável para steps de wizard
 * 
 * Elimina duplicação de padrões de navegação:
 * - Botão Voltar (ghost)
 * - Botão de ação principal (primário)
 * - Botão de pular (opcional)
 * - Loading states
 */

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, SkipForward, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      'px-6 py-4 border-t bg-background/95 backdrop-blur',
      'flex items-center justify-between gap-3',
      className
    )}>
      {/* Left side */}
      <div className="flex items-center gap-2">
        {leftContent ?? (
          showBack && onBack && (
            <Button 
              variant="ghost" 
              onClick={onBack}
              disabled={backDisabled}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {backLabel}
            </Button>
          )
        )}
      </div>
      
      {/* Right side */}
      <div className="flex items-center gap-2">
        {showSkip && onSkip && (
          <Button 
            variant="ghost" 
            onClick={onSkip}
            className="text-muted-foreground"
          >
            <SkipForward className="h-4 w-4 mr-1" />
            {skipLabel}
          </Button>
        )}
        
        {rightContent ?? (
          !hidePrimary && onPrimary && (
            <Button
              onClick={onPrimary}
              disabled={primaryDisabled || primaryLoading}
              className={cn(
                primaryVariant === 'success' && 'bg-success text-success-foreground hover:bg-success/90'
              )}
            >
              {primaryLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PrimaryIcon className="h-4 w-4 mr-2" />
              )}
              {primaryLabel}
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

/** Footer for first step (no back button) */
export function WizardFirstStepFooter(props: Omit<WizardStepFooterProps, 'showBack'>) {
  return <WizardStepFooter {...props} showBack={false} />;
}

/** Footer for last step (complete button) */
export function WizardLastStepFooter(props: Omit<WizardStepFooterProps, 'primaryLabel' | 'primaryVariant'>) {
  return (
    <WizardStepFooter 
      {...props} 
      primaryLabel={props.primaryLoading ? 'Concluindo...' : 'Concluir'} 
      primaryVariant="success" 
    />
  );
}

/** Footer for optional step (with skip button) */
export function WizardOptionalStepFooter(props: Omit<WizardStepFooterProps, 'showSkip'>) {
  return <WizardStepFooter {...props} showSkip />;
}
