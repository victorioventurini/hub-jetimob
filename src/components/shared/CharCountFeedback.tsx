/**
 * CharCountFeedback — Contador de caracteres reutilizável com estados visuais.
 *
 * Estados:
 *   - default : count abaixo do limiar de aviso
 *   - warning : count >= showWarningAt (default 90% do max)
 *   - error   : count > maxLength (excedeu)
 *
 * Padrão de exibição: "{count}/{max}" alinhado à direita, tipografia muted.
 *
 * Uso:
 *   <CharCountFeedback value={field.value} maxLength={ENTITY_NAME_LIMITS.PROJECT_NAME} />
 */
import { cn } from '@/lib/utils';

export interface CharCountFeedbackProps {
  /** Valor atual do campo. */
  value: string;
  /** Limite máximo de caracteres. */
  maxLength: number;
  /** A partir de quantos chars exibir o estado de warning. Default: 90% do maxLength. */
  showWarningAt?: number;
  /** Classe extra para o wrapper. */
  className?: string;
}

export function CharCountFeedback({
  value,
  maxLength,
  showWarningAt,
  className,
}: CharCountFeedbackProps) {
  const count = value?.length ?? 0;
  const warningThreshold = showWarningAt ?? Math.floor(maxLength * 0.9);

  const state: 'default' | 'warning' | 'error' =
    count > maxLength ? 'error' : count >= warningThreshold ? 'warning' : 'default';

  return (
    <p
      className={cn(
        'text-xs text-right tabular-nums transition-colors',
        state === 'default' && 'text-muted-foreground',
        state === 'warning' && 'text-warning',
        state === 'error' && 'text-destructive font-medium',
        className,
      )}
      aria-live="polite"
    >
      {count}/{maxLength}
    </p>
  );
}
