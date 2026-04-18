/**
 * StarRating — input/display compartilhado de avaliação 1-5
 */
import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  className?: string;
}

export function StarRatingInput({ value, onChange, size = 22, className }: InputProps) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hovered || value) >= n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="rounded p-0.5 transition-colors hover:bg-accent"
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          >
            <Star
              size={size}
              className={cn(
                "transition-colors",
                filled ? "fill-warning text-warning" : "text-muted-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

interface DisplayProps {
  rating: number;
  size?: number;
  className?: string;
}

export function StarRatingDisplay({ rating, size = 14, className }: DisplayProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={cn(
            rating >= n ? "fill-warning text-warning" : "text-muted-foreground"
          )}
        />
      ))}
    </div>
  );
}
