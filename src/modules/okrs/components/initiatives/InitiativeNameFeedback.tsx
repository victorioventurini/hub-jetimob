/**
 * InitiativeNameFeedback
 * 
 * Componente visual para exibir feedback da validação semântica de IA
 * sobre o nome de uma iniciativa.
 * 
 * Estilos:
 * - warning: Amarelo - indica que parece um resultado, não ação
 * - suggestion: Azul - dica de melhoria
 * - success: Verde - confirmação discreta
 */

import { AlertTriangle, Lightbulb, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InitiativeNameFeedback as FeedbackType, InitiativeNameFeedbackType } from '../../hooks/useInitiativeNameValidation';

interface InitiativeNameFeedbackProps {
  feedback: FeedbackType | null;
  isValidating: boolean;
  className?: string;
}

const FEEDBACK_STYLES: Record<InitiativeNameFeedbackType, {
  containerClass: string;
  iconClass: string;
  Icon: typeof AlertTriangle;
}> = {
  warning: {
    containerClass: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/50',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
    Icon: AlertTriangle,
  },
  suggestion: {
    containerClass: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50',
    iconClass: 'text-blue-600 dark:text-blue-400',
    Icon: Lightbulb,
  },
  success: {
    containerClass: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/50',
    iconClass: 'text-green-600 dark:text-green-400',
    Icon: CheckCircle,
  },
};

export function InitiativeNameFeedback({
  feedback,
  isValidating,
  className,
}: InitiativeNameFeedbackProps) {
  // Loading state
  if (isValidating) {
    return (
      <div className={cn(
        'flex items-center gap-2 text-xs text-muted-foreground mt-1.5',
        className
      )}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Analisando...</span>
      </div>
    );
  }

  // No feedback
  if (!feedback) {
    return null;
  }

  const { containerClass, iconClass, Icon } = FEEDBACK_STYLES[feedback.type];

  return (
    <div className={cn(
      'flex items-start gap-2 text-xs rounded-md border p-2 mt-1.5',
      containerClass,
      className
    )}>
      <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', iconClass)} />
      <div className="space-y-0.5">
        <p className="text-foreground/80">{feedback.message}</p>
        {feedback.suggestion && feedback.type !== 'success' && (
          <p className="text-muted-foreground italic">
            Sugestão: "{feedback.suggestion}"
          </p>
        )}
      </div>
    </div>
  );
}
