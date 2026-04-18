/**
 * AnalysisFeedback — rating + comentário opcional
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRatingInput } from "@/components/ui/star-rating";
import { useAnalysisFeedback } from "../../hooks/useAnalysisFeedback";

interface Props {
  reportId: string;
}

export function AnalysisFeedback({ reportId }: Props) {
  const { data, submit, isSubmitting } = useAnalysisFeedback(reportId);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    if (data?.myRating) setRating(data.myRating);
  }, [data?.myRating]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Esta análise foi útil?</h3>
          {data && data.count > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Média {data.average.toFixed(1)} ({data.count} {data.count === 1 ? "voto" : "votos"})
            </p>
          )}
        </div>
        <StarRatingInput value={rating} onChange={setRating} size={20} />
      </div>

      {rating > 0 && (
        <div className="mt-3 space-y-2">
          <Textarea
            placeholder="O que poderia melhorar? (opcional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={500}
            className="resize-none text-sm"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => submit({ rating, text: text.trim() || undefined })}
              disabled={isSubmitting}
            >
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
