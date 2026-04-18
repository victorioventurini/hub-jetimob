import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { AnalysisMode } from "../../types";

const OPTIONS: { value: AnalysisMode; label: string; desc: string }[] = [
  { value: "auto", label: "Automático", desc: "IA escolhe os módulos" },
  { value: "manual", label: "Manual", desc: "Você seleciona os módulos" },
  { value: "mixed", label: "Misto", desc: "Sugestão + ajuste" },
];

interface Props {
  value: AnalysisMode;
  onChange: (v: AnalysisMode) => void;
}

export function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Modo</Label>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              value === opt.value
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent"
            )}
          >
            <p className="text-sm font-medium text-foreground">{opt.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
