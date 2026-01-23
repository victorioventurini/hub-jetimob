/**
 * ObjectiveInputWithValidation - Input de objetivo com validação manual
 * 
 * Estados:
 * - editing: Campo editável, botão "Validar Objetivo"
 * - validating: Campo readonly, spinner
 * - validated: Campo travado, botão "Editar"
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, Pencil, Sparkles, AlertCircle, Lightbulb } from 'lucide-react';
import { VicTypewriterText } from '@/modules/vic';
import { FEEDBACK_STYLES } from '@/lib/colors';
import type { ObjectiveValidationFeedback } from '@/modules/okrs/hooks';

// ============================================================
// TYPES
// ============================================================

export interface ObjectiveInputWithValidationProps {
  value: string;
  onChange: (value: string) => void;
  feedback: ObjectiveValidationFeedback | null;
  validatedAt: string | null;
  isValidating: boolean;
  onValidate: () => void;
  onEdit: () => void;
  onSelectAlternative: (alt: string) => void;
  minLength?: number;
  placeholder?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function ObjectiveInputWithValidation({
  value,
  onChange,
  feedback,
  validatedAt,
  isValidating,
  onValidate,
  onEdit,
  onSelectAlternative,
  minLength = 10,
  placeholder = 'Escreva um objetivo inspirador e claro...',
}: ObjectiveInputWithValidationProps) {
  const isValidated = !!validatedAt && !!feedback;
  const canValidate = value.trim().length >= minLength && !isValidating && !isValidated;
  
  return (
    <div className="space-y-3">
      {/* Input Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isValidating || isValidated}
            className={cn(
              "pr-10 transition-all",
              isValidating && "opacity-60",
              isValidated && feedback?.type === 'success' && "border-status-green bg-status-green/5",
              isValidated && feedback?.type === 'warning' && "border-status-yellow bg-status-yellow/5",
              isValidated && feedback?.type === 'suggestion' && "border-info bg-info/5"
            )}
          />
          {isValidated && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className={cn(
                "h-4 w-4",
                feedback?.type === 'success' && "text-status-green",
                feedback?.type === 'warning' && "text-status-yellow",
                feedback?.type === 'suggestion' && "text-info"
              )} />
            </div>
          )}
        </div>
        
        {/* Action Button */}
        {isValidated ? (
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onEdit}
            className="shrink-0 gap-2"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="default"
            onClick={onValidate}
            disabled={!canValidate}
            className="shrink-0 gap-2"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Validar Objetivo
              </>
            )}
          </Button>
        )}
      </div>
      
      {/* Validation Feedback */}
      {feedback && isValidated && (
        <div className={cn(
          "p-4 rounded-xl border text-sm space-y-3",
          feedback.type === 'warning' && FEEDBACK_STYLES.warning.container,
          feedback.type === 'suggestion' && FEEDBACK_STYLES.suggestion.container,
          feedback.type === 'success' && FEEDBACK_STYLES.success.container
        )}>
          {/* Header with icon */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-1.5 rounded-lg shrink-0",
              feedback.type === 'warning' && "bg-status-yellow/20",
              feedback.type === 'suggestion' && "bg-info/20",
              feedback.type === 'success' && "bg-status-green/20"
            )}>
              {feedback.type === 'warning' && <AlertCircle className={cn("h-4 w-4", FEEDBACK_STYLES.warning.icon)} />}
              {feedback.type === 'suggestion' && <Sparkles className={cn("h-4 w-4", FEEDBACK_STYLES.suggestion.icon)} />}
              {feedback.type === 'success' && <CheckCircle2 className={cn("h-4 w-4", FEEDBACK_STYLES.success.icon)} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm leading-relaxed",
                feedback.type === 'warning' && FEEDBACK_STYLES.warning.text,
                feedback.type === 'suggestion' && FEEDBACK_STYLES.suggestion.text,
                feedback.type === 'success' && FEEDBACK_STYLES.success.text
              )}>
                <VicTypewriterText text={feedback.message} speed={18} priority={0} />
              </p>
            </div>
          </div>

          {/* Alternatives */}
          {feedback.alternatives && feedback.alternatives.length > 0 && (
            <div className="pt-2 border-t border-border/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3" />
                Sugestões alternativas
              </p>
              <div className="grid gap-2">
                {feedback.alternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectAlternative(alt)}
                    className={cn(
                      "text-left w-full px-3 py-2.5 rounded-lg text-xs",
                      "bg-background/80 hover:bg-background",
                      "border border-border/50 hover:border-primary/50",
                      "transition-all duration-200",
                      "hover:shadow-sm hover:translate-x-0.5",
                      "group flex items-center gap-2"
                    )}
                  >
                    <span className="flex-1">{alt}</span>
                    <span className="text-muted-foreground group-hover:text-primary transition-colors text-[10px]">
                      usar →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Helper text when not validated */}
      {!isValidated && !isValidating && value.length > 0 && value.length < minLength && (
        <p className="text-xs text-muted-foreground">
          Digite pelo menos {minLength} caracteres para validar o objetivo
        </p>
      )}
    </div>
  );
}
