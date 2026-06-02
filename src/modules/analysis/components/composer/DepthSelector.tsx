import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { AnalysisDepth } from "../../types";

const OPTIONS: { value: AnalysisDepth; label: string; desc: string }[] = [
  { value: "minimal", label: "Rápida", desc: "Resumo direto" },
  { value: "standard", label: "Padrão", desc: "Análise balanceada" },
  { value: "full", label: "Profunda", desc: "Detalhada e comparativa" },
];

interface Props {
  value: AnalysisDepth;
  onChange: (v: AnalysisDepth) => void;
}

export function DepthSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Profundidade</Label>
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
