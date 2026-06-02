import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const SCOPES = [
  { value: "bu", label: "BU inteira" },
  { value: "team", label: "Times" },
  { value: "area", label: "Áreas" },
  { value: "user", label: "Pessoas" },
  { value: "project", label: "Projetos" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function ScopePills({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Escopo</Label>
      <div className="flex flex-wrap gap-1.5">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              value === s.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
