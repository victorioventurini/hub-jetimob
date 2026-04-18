/**
 * ModulesChips — seleção múltipla de módulos
 */
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BarChart3, Target, FolderKanban, ClipboardCheck, Sparkles } from "lucide-react";

const MODULES = [
  { value: "kpis", label: "KPIs / Métricas", icon: BarChart3 },
  { value: "okrs", label: "OKRs", icon: Target },
  { value: "projects", label: "Projetos", icon: FolderKanban },
  { value: "checkins", label: "Check-ins", icon: ClipboardCheck },
  { value: "wizards", label: "Reflexões (Wizards)", icon: Sparkles },
];

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}

export function ModulesChips({ value, onChange, disabled }: Props) {
  const toggle = (m: string) => {
    if (value.includes(m)) onChange(value.filter((x) => x !== m));
    else onChange([...value, m]);
  };

  return (
    <div className="space-y-2">
      <Label className={cn("text-sm font-medium", disabled && "text-muted-foreground")}>
        Módulos a considerar
        {disabled && (
          <Badge variant="secondary" className="ml-2 text-xs">
            IA decidirá automaticamente
          </Badge>
        )}
      </Label>
      <div className="flex flex-wrap gap-2">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const active = value.includes(m.value);
          return (
            <button
              key={m.value}
              type="button"
              disabled={disabled}
              onClick={() => toggle(m.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
