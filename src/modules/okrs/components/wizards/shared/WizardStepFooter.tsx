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
      'flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 min-w-0 overflow-x-hidden',
      className
    )}>
      {/* Left side */}
      <div className="flex items-center gap-2 min-w-0 max-w-full flex-wrap">
        {leftContent ?? (
          showBack && onBack && (
            <Button 
              variant="ghost" 
              onClick={onBack}
              disabled={backDisabled}
              className="min-w-0 max-w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="truncate">{backLabel}</span>
            </Button>
          )
        )}
      </div>
      
      {/* Right side */}
      <div className="flex items-center gap-2 min-w-0 max-w-full flex-wrap sm:justify-end sm:ml-auto">
        {showSkip && onSkip && (
          <Button 
            variant="ghost" 
            onClick={onSkip}
            className="text-muted-foreground min-w-0 max-w-full"
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
                'min-w-0 max-w-full',
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
