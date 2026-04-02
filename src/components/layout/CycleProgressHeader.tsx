import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useHeaderCycleProgress, type HeaderQuarterProgress } from "@/modules/okrs/hooks/useHeaderCycleProgress";

type CycleProgressHeaderVariant = "compact" | "card" | "segmented";

interface CycleProgressHeaderProps {
  variant?: CycleProgressHeaderVariant;
  className?: string;
}

const quarterStateStyles = {
  done: {
    container: "bg-success-muted border-success/40 text-success",
    track: "bg-success/20",
    fill: "bg-success",
  },
  active: {
    container: "bg-info-muted border-info/40 text-info",
    track: "bg-info/20",
    fill: "bg-info",
  },
  future: {
    container: "bg-muted border-border text-muted-foreground",
    track: "bg-muted-foreground/15",
    fill: "bg-muted-foreground/40",
  },
} as const;

function QuarterMiniBlock({ quarter }: { quarter: HeaderQuarterProgress }) {
  const styles = quarterStateStyles[quarter.state];
  const stateLabel = quarter.state === "done" ? "concluído" : quarter.state === "active" ? "ativo" : "futuro";

  const block = (
    <div
      className={cn(
        "rounded-md border px-2 py-1 min-w-[50px]",
        styles.container,
        quarter.cycleId && "cursor-pointer hover:opacity-80 transition-opacity",
      )}
      aria-label={`${quarter.label} ${stateLabel} ${quarter.percent}%`}
      title={`${quarter.label} · ${stateLabel} · ${quarter.percent}% — Clique para ver OKRs`}
    >
      <div className="text-[10px] font-semibold leading-none">{quarter.label}</div>
      <div className={cn("mt-1 h-[3px] w-full overflow-hidden rounded-full", styles.track)}>
        <div
          className={cn("h-full rounded-full transition-all", styles.fill)}
          style={{ width: `${quarter.percent}%` }}
        />
      </div>
    </div>
  );

  if (!quarter.cycleId) return block;

  return (
    <Link to={`/okrs?cycle_id=${quarter.cycleId}`} className="no-underline">
      {block}
    </Link>
  );
}

export function CycleProgressHeader({ variant = "segmented", className }: CycleProgressHeaderProps) {
  const { quarters, yearPercent, activeQuarterLabel, activeQuarterPercent, hasQuarterData, isLoading } = useHeaderCycleProgress();

  if (isLoading) {
    return <div className="hidden md:flex text-xs text-muted-foreground">Carregando ciclos…</div>;
  }

  if (!hasQuarterData) {
    return (
      <div className="hidden md:flex text-xs text-muted-foreground" aria-label="Ciclos indisponíveis">
        Ciclos indisponíveis
      </div>
    );
  }

  const desktopCommon = (
    <>
      {quarters.map((quarter, index) => (
        <div key={quarter.label} className="flex items-center gap-1.5">
          <QuarterMiniBlock quarter={quarter} />
          {index < quarters.length - 1 && <span className="text-muted-foreground/70 text-xs">—</span>}
        </div>
      ))}
      <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap">{yearPercent}% do ano</span>
    </>
  );

  return (
    <>
      <div className="md:hidden min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground truncate">
          Ano {yearPercent}% · {activeQuarterLabel ?? "Q-"} {activeQuarterPercent}%
        </div>
        <Progress value={yearPercent} className="mt-1 h-1" />
      </div>

      <div className={cn("hidden md:flex items-center", className)}>
        {variant === "compact" && <div className="flex items-center gap-1.5">{desktopCommon}</div>}

        {variant === "segmented" && (
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-2 py-1">
            {desktopCommon}
          </div>
        )}

        {variant === "card" && (
          <div className="rounded-lg border border-border bg-card/80 px-3 py-2 min-w-[420px]">
            <div className="flex items-center gap-1.5 mb-2">{desktopCommon}</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-10">Ano</span>
                <Progress value={yearPercent} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground w-9 text-right">{yearPercent}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-10">{activeQuarterLabel ?? "Q-"}</span>
                <Progress value={activeQuarterPercent} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground w-9 text-right">{activeQuarterPercent}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
