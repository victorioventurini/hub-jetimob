import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from "date-fns";
import type { AnalysisPeriod } from "../../types";

const presets: { key: string; label: string; build: () => AnalysisPeriod }[] = [
  {
    key: "this_month",
    label: "Este mês",
    build: () => ({
      start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      label: "Este mês",
    }),
  },
  {
    key: "last_month",
    label: "Mês passado",
    build: () => {
      const d = subMonths(new Date(), 1);
      return {
        start: format(startOfMonth(d), "yyyy-MM-dd"),
        end: format(endOfMonth(d), "yyyy-MM-dd"),
        label: "Mês passado",
      };
    },
  },
  {
    key: "this_quarter",
    label: "Este trimestre",
    build: () => ({
      start: format(startOfQuarter(new Date()), "yyyy-MM-dd"),
      end: format(endOfQuarter(new Date()), "yyyy-MM-dd"),
      label: "Este trimestre",
    }),
  },
  {
    key: "last_quarter",
    label: "Trimestre passado",
    build: () => {
      const d = subMonths(new Date(), 3);
      return {
        start: format(startOfQuarter(d), "yyyy-MM-dd"),
        end: format(endOfQuarter(d), "yyyy-MM-dd"),
        label: "Trimestre passado",
      };
    },
  },
  {
    key: "this_year",
    label: "Todo o ano",
    build: () => ({
      start: format(startOfYear(new Date()), "yyyy-MM-dd"),
      end: format(endOfYear(new Date()), "yyyy-MM-dd"),
      label: "Todo o ano",
    }),
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
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = value.label === p.label;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.build())}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
