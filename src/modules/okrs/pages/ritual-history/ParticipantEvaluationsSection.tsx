/**
 * ParticipantEvaluationsSection — exibe avaliações de um ritual a partir
 * dos addendums (`type === 'participant_evaluation'`).
 * Extraído de `RitualHistoryPage.tsx` em P3.2.
 */

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ParticipantEvaluationsSection({ addendums }: { addendums: unknown[] | null }) {
  const evaluationAddendum = (addendums ?? []).find(
    (a: any) => a?.type === 'participant_evaluation',
  ) as { evaluations?: Array<{ score: number; feedback: string }> } | undefined;

  const evaluations = evaluationAddendum?.evaluations ?? [];
  if (evaluations.length === 0) return null;

  const avgScore = evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Star className="h-4 w-4" />
        Avaliações do Ritual ({evaluations.length})
        <span className="text-xs font-normal text-muted-foreground ml-1">
          — Média: {avgScore.toFixed(1)}/5
        </span>
      </h4>

      <div className="space-y-2">
        {evaluations.map((ev, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20"
          >
            <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'h-3.5 w-3.5',
                    s <= ev.score ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
                  )}
                />
              ))}
            </div>

            <div className="flex-1 min-w-0">
              {ev.feedback?.trim() ? (
                <p className="text-sm text-foreground">{ev.feedback}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sem comentário</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
