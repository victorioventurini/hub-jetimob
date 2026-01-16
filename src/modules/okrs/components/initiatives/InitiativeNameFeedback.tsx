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
import type { InitiativeNameFeedback as FeedbackType, InitiativeNameFeedbackType } from "../../hooks";
import { FEEDBACK_STYLES } from '@/lib/colors';

interface InitiativeNameFeedbackProps {
  feedback: FeedbackType | null;
  isValidating: boolean;
  className?: string;
}

const FEEDBACK_ICONS: Record<InitiativeNameFeedbackType, typeof AlertTriangle> = {
  warning: AlertTriangle,
  suggestion: Lightbulb,
  success: CheckCircle,
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

  const styles = FEEDBACK_STYLES[feedback.type];
  const Icon = FEEDBACK_ICONS[feedback.type];

  return (
    <div className={cn(
      'flex items-start gap-2 text-xs rounded-md border p-2 mt-1.5',
      styles.container,
      className
    )}>
      <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', styles.icon)} />
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
