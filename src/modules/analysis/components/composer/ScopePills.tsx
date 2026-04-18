/**
 * ScopePills — escopo da análise (BU inteira / áreas / times)
 * Versão inicial: BU-wide vs filtros opcionais
 */
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AnalysisScope } from "../../types";

interface Props {
  value: AnalysisScope;
  onChange: (v: AnalysisScope) => void;
}

export function ScopePills({ value, onChange }: Props) {
  const isBuWide = value.buWide ?? true;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Escopo</Label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange({ buWide: true })}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium",
            isBuWide
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          Toda a BU
        </button>
        <button
          type="button"
          disabled
          className="rounded-full border border-dashed border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground"
          title="Em breve: filtrar por times e áreas específicos"
        >
          Por área/time (em breve)
        </button>
      </div>
    </div>
  );
}
