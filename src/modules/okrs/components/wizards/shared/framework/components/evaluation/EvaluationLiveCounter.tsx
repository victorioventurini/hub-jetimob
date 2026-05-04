/**
 * EvaluationLiveCounter — "X de Y responderam · ●●●○○"
 * Apresentacional puro.
 */
import { cn } from '@/lib/utils';

export interface EvaluationLiveCounterProps {
  responseCount: number;
  expectedCount: number;
  className?: string;
}

export function EvaluationLiveCounter({
  responseCount,
  expectedCount,
  className,
}: EvaluationLiveCounterProps) {
  const total = Math.max(expectedCount, responseCount);
  const dots = Array.from({ length: total }, (_, i) => i < responseCount);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="text-sm font-medium text-muted-foreground">
        <span className="text-foreground text-base">{responseCount}</span>
        {expectedCount > 0 && (
          <>
            {' de '}
            <span className="text-foreground text-base">{expectedCount}</span>
            {' presentes responderam'}
          </>
        )}
        {expectedCount === 0 && responseCount > 0 && ' resposta(s) recebida(s)'}
      </div>
      {total > 0 && total <= 30 && (
        <div className="flex gap-1" aria-hidden>
          {dots.map((filled, i) => (
            <span
              key={i}
              className={cn(
                'h-2 w-2 rounded-full',
                filled ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      )}
      <div className="text-xs text-muted-foreground italic">
        Nenhum nome aparece. Você só vê quantos responderam.
      </div>
    </div>
  );
}
