/**
 * Hero section for external dashboard
 * Professional, welcoming greeting
 */
import { useGreeting } from "@/hooks/useGreeting";
import type { ExternalUserInfo } from "../types";

interface ExternalHeroProps {
  externalInfo: ExternalUserInfo;
}

export function ExternalHero({ externalInfo }: ExternalHeroProps) {
  const { greeting } = useGreeting({ userName: externalInfo.name.split(" ")[0] });
  const legalName = externalInfo.buLegalName || externalInfo.buName;

  return (
    <section className="animate-fade-in">
      <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
        {greeting}
      </h1>
      <p className="text-lg text-muted-foreground">
        Você está interagindo com a <span className="font-medium text-foreground">{legalName}</span>
      </p>
    </section>
  );
}
