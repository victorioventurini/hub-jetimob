/**
 * WebhooksTab — Webhook padrão global para novas oportunidades
 */
import { WebhookSimulator } from "../opportunities/WebhookSimulator";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

export function WebhooksTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Webhook Padrão
            <HelpTooltip content="O webhook configurado aqui será usado como padrão para todos os eventos. Cada evento pode optar por usar este webhook padrão ou definir um webhook customizado na página de configuração individual." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Configure o endpoint padrão para envio de novas oportunidades capturadas nos eventos.
            Eventos individuais podem sobrescrever esta configuração.
          </p>
        </CardContent>
      </Card>

      <WebhookSimulator />
    </div>
  );
}
