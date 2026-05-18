import { cn } from "@/lib/utils";
import type { QuestionComponentProps, ScaleConfig } from "./types";

export function ScaleQuestion({ value, onChange, disabled, options }: QuestionComponentProps) {
  const cfg = (options as ScaleConfig | null) ?? { min: 0, max: 10, step: 1 };
  const step = cfg.step && cfg.step > 0 ? cfg.step : 1;
  const values: number[] = [];
  for (let v = cfg.min; v <= cfg.max; v += step) values.push(v);
  const selected = value.scale_value;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Escala">
        {values.map((v) => {
          const isSelected = selected === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange({ scale_value: v })}
              className={cn(
                "min-w-[40px] h-10 px-3 rounded-md border text-sm font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-accent/40 border-border",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              {v}
            </button>
          );
        })}
      </div>
      {(cfg.min_label || cfg.max_label) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{cfg.min_label ?? ""}</span>
          <span>{cfg.max_label ?? ""}</span>
        </div>
      )}
    </div>
  );
}
