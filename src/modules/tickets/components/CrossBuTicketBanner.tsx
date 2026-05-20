import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CrossBuTicketBannerProps {
  buName: string;
  onSwitch: () => void;
  onBack: () => void;
}

/**
 * Banner exibido quando o usuário abre um link de ticket pertencente
 * a outra BU à qual ele tem acesso. Segue o padrão canônico
 * `mem://features/tickets/cross-bu-isolation` — UX guard "instruir + botão"
 * (sem auto-switch), com CTA primário evidente para reduzir fricção.
 */
export function CrossBuTicketBanner({ buName, onSwitch, onBack }: CrossBuTicketBannerProps) {
  return (
    <Card className="border-primary/30 bg-primary/5 p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="flex-1 space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">
            Este ticket está em outra BU
          </h2>
          <p className="text-sm text-muted-foreground">
            Você tem acesso a este ticket na BU{" "}
            <span className="font-medium text-foreground">{buName}</span>.
            Para visualizá-lo, troque para essa BU.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="ghost" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onSwitch} size="lg" className="gap-2">
            Abrir em {buName}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
