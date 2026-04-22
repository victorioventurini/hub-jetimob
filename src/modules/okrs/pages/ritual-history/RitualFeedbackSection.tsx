/**
 * RitualFeedbackSection — exibe feedback livre do ritual (`reflectionData.data.ritualFeedback`).
 * Extraído de `RitualHistoryPage.tsx` em P3.2.
 */

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RitualImprovementFeedback } from '../../types/wizard';

export function RitualFeedbackSection({ reflectionData }: { reflectionData: any }) {
  const feedbacks: RitualImprovementFeedback[] =
    (reflectionData as any)?.data?.ritualFeedback ?? [];

  if (feedbacks.length === 0) return null;

  const avgRating = feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Star className="h-4 w-4" />
        Feedback do Ritual ({feedbacks.length})
        <span className="text-xs font-normal text-muted-foreground ml-1">
          — Média: {avgRating.toFixed(1)}
        </span>
      </h4>

      <div className="space-y-2">
        {feedbacks.map((fb) => (
          <div
            key={fb.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20"
          >
            <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'h-3.5 w-3.5',
                    s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
                  )}
                />
              ))}
            </div>

            <div className="flex-1 min-w-0">
              {fb.text?.trim() ? (
                <p className="text-sm text-foreground">{fb.text}</p>
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
