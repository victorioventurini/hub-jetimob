/**
 * ModeSelector — Auto / Manual / Misto
 */
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AnalysisMode } from "../../types";

const OPTIONS: { value: AnalysisMode; label: string; desc: string }[] = [
  { value: "auto", label: "Automático", desc: "IA escolhe os módulos a partir da premissa" },
  { value: "manual", label: "Manual", desc: "Você seleciona quais módulos usar" },
  { value: "mixed", label: "Misto", desc: "IA sugere, você ajusta" },
];

interface Props {
  value: AnalysisMode;
  onChange: (v: AnalysisMode) => void;
}

export function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Modo de seleção de módulos</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
