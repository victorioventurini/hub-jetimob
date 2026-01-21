/**
 * DashboardHero - Unified hero section for all dashboard types
 * Supports: internal (with productivity tip) and external (with company context)
 */
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, Sparkles } from "lucide-react";

export type DashboardHeroVariant = "internal" | "external";

interface DashboardHeroBaseProps {
  greeting: string;
  variant?: DashboardHeroVariant;
}

interface InternalHeroProps extends DashboardHeroBaseProps {
  variant?: "internal";
  tip?: string;
  tipLoading?: boolean;
  isFromAI?: boolean;
}

interface ExternalHeroProps extends DashboardHeroBaseProps {
  variant: "external";
  companyName: string;
}

export type DashboardHeroProps = InternalHeroProps | ExternalHeroProps;

export function DashboardHero(props: DashboardHeroProps) {
  const { greeting, variant = "internal" } = props;

  if (variant === "external") {
    const { companyName } = props as ExternalHeroProps;
    return (
      <section className="animate-fade-in">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
          {greeting}
        </h1>
        <p className="text-lg text-muted-foreground">
          Você está interagindo com a <span className="font-medium text-foreground">{companyName}</span>
        </p>
      </section>
    );
  }

  // Internal variant
  const { tip, tipLoading, isFromAI } = props as InternalHeroProps;

  return (
    <section className="animate-fade-in">
      <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
        {greeting}
      </h1>
      {tipLoading ? (
        <Skeleton className="h-5 w-80 mt-2" />
      ) : tip ? (
        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-status-yellow shrink-0" />
          <span>{tip}</span>
          {isFromAI && (
            <Sparkles className="h-3 w-3 text-primary shrink-0" aria-label="Gerada por IA" />
          )}
        </p>
      ) : null}
    </section>
  );
}
