import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { AnalysisModule } from "../../types";

const MODULES: { value: AnalysisModule; label: string }[] = [
  { value: "kpis", label: "KPIs" },
  { value: "okrs", label: "OKRs" },
  { value: "projects", label: "Projetos" },
  { value: "initiatives", label: "Iniciativas" },
  { value: "checkins", label: "Check-ins" },
  { value: "wizards", label: "Reflexões" },
];

interface Props {
  value: AnalysisModule[];
  onChange: (v: AnalysisModule[]) => void;
  disabled?: boolean;
}

export function ModulesChips({ value, onChange, disabled }: Props) {
  const toggle = (m: AnalysisModule) => {
    if (value.includes(m)) onChange(value.filter((x) => x !== m));
    else onChange([...value, m]);
  };
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Módulos</Label>
      <div className="flex flex-wrap gap-1.5">
        {MODULES.map((m) => {
          const active = value.includes(m.value);
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => toggle(m.value)}
              disabled={disabled}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
