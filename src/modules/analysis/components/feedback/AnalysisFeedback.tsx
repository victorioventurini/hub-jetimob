/**
 * AnalysisFeedback — captura nota 1-5 e texto opcional
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
  const { feedback, submit, isSubmitting } = useAnalysisFeedback(reportId);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    if (feedback) {
      setRating(feedback.rating);
      setText(feedback.text ?? "");
    }
  }, [feedback]);

  const onSubmit = () => {
    if (!rating) return;
    submit({ rating, text: text.trim() || undefined });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">Avalie esta análise</h3>
      <div className="flex items-center gap-3">
        <StarRatingInput value={rating} onChange={setRating} />
        <span className="text-xs text-muted-foreground">
          {rating ? `${rating}/5` : "Selecione uma nota"}
        </span>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Comentário (opcional)"
        rows={2}
        maxLength={1000}
        className="resize-none"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={onSubmit} disabled={!rating || isSubmitting}>
          {feedback ? "Atualizar" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
