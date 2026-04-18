/**
 * StarRating — componentes canônicos de avaliação 1-5 estrelas
 *
 * Extraído de MbrClosingStep / QbrMeetingClosingStep para reuso global.
 * Visual idêntico ao original (yellow-400 fill).
 */
import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  className?: string;
}

export function StarRatingInput({
  value,
  onChange,
  size = 20,
  className,
}: StarRatingInputProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
            className="p-0.5 transition-colors"
            onMouseEnter={() => setHovered(star)}
            onClick={() => onChange(star)}
          >
            <Star
              size={size}
              className={cn(
                "transition-colors",
                filled ? "text-yellow-400" : "text-muted-foreground",
              )}
              fill={filled ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}

interface StarRatingDisplayProps {
  rating: number;
  size?: number;
  className?: string;
}

export function StarRatingDisplay({
  rating,
  size = 14,
  className,
}: StarRatingDisplayProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={cn(
            star <= rating ? "text-yellow-400" : "text-muted-foreground/40",
          )}
          fill={star <= rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}
