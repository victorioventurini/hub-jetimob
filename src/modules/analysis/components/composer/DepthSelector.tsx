/**
 * DepthSelector — profundidade da análise
 */
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AnalysisDepth } from "../../types";

const OPTIONS: { value: AnalysisDepth; label: string; desc: string }[] = [
  { value: "auto", label: "Auto", desc: "IA decide" },
  { value: "minimal", label: "Resumida", desc: "Só essencial" },
  { value: "standard", label: "Padrão", desc: "Equilibrada" },
  { value: "full", label: "Profunda", desc: "Análise completa" },
];

interface Props {
  value: AnalysisDepth;
  onChange: (v: AnalysisDepth) => void;
}

export function DepthSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Profundidade</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "rounded-lg border p-2 text-left",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <div className="text-xs font-medium">{o.label}</div>
              <div className="text-[10px] text-muted-foreground">{o.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
