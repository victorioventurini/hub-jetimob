/**
 * PeriodPills — presets de período (último 7d, 30d, mês passado, trimestre, ano)
 */
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AnalysisPeriod } from "../../types";

const PRESETS: { id: string; label: string; build: () => AnalysisPeriod }[] = [
  {
    id: "last_7_days",
    label: "Últimos 7 dias",
    build: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        preset: "last_7_days",
      };
    },
  },
  {
    id: "last_30_days",
    label: "Últimos 30 dias",
    build: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        preset: "last_30_days",
      };
    },
  },
  {
    id: "last_month",
    label: "Mês passado",
    build: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        preset: "last_month",
      };
    },
  },
  {
    id: "last_quarter",
    label: "Trimestre passado",
    build: () => {
      const now = new Date();
      const q = Math.floor(now.getMonth() / 3);
      const startMonth = (q - 1) * 3;
      const start = new Date(now.getFullYear(), startMonth, 1);
      const end = new Date(now.getFullYear(), startMonth + 3, 0);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        preset: "last_quarter",
      };
    },
  },
  {
    id: "ytd",
    label: "Ano corrente",
    build: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        start: start.toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10),
        preset: "ytd",
      };
    },
  },
];

interface Props {
  value: AnalysisPeriod;
  onChange: (v: AnalysisPeriod) => void;
}

export function PeriodPills({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Período</Label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const active = value.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.build())}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {value.start} → {value.end}
      </p>
    </div>
  );
}
