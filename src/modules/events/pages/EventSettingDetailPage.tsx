/**
 * EventSettingDetailPage — Detalhe do evento + webhook config (padrão ou customizado)
 */
import { useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, Calendar, Users, ExternalLink } from "lucide-react";
import { WebhookSimulator } from "../components/opportunities/WebhookSimulator";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { EVENT_SETTINGS_MOCK, type QuotaName } from "../mocks/eventSettings";

const QUOTA_VARIANT: Record<QuotaName, string> = {
  Diamante: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  Esmeralda: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Ouro: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Prata: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function EventSettingDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = EVENT_SETTINGS_MOCK.find((e) => e.id === eventId);
  const [webhookMode, setWebhookMode] = useState<"default" | "custom">("default");

  if (!event) return <Navigate to="/events/settings" replace />;

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title={event.name}
          description="Configurações e webhook do evento"
          breadcrumbs={[
            { label: "Eventos", href: "/events" },
            { label: "Configurações", href: "/events/settings" },
            { label: event.name },
          ]}
        />

        {/* Event summary card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Resumo do Evento
              <HelpTooltip content="Dados resumidos do evento: data, local, público e cota de patrocínio." size="sm" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm font-medium">
                    {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Localização</p>
                  <p className="text-sm font-medium">{event.city}, {event.uf}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Público</p>
                  <p className="text-sm font-medium">
                    {event.projectedAudience} proj. · {event.totalRegistrations} insc. · {event.totalAttendees} part.
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cota</p>
                <Badge
                  variant="secondary"
                  className={`text-xs font-semibold ${QUOTA_VARIANT[event.quota]}`}
                >
                  {event.quota}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook mode selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Modo do Webhook
              <HelpTooltip content="Escolha entre usar o webhook padrão configurado nas Configurações gerais ou definir um webhook customizado exclusivo para este evento." size="sm" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={webhookMode} onValueChange={(v) => setWebhookMode(v as "default" | "custom")}>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="default" id="wh-default" className="mt-0.5" />
                <div>
                  <Label htmlFor="wh-default" className="text-sm font-medium cursor-pointer">
                    Usar webhook padrão
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Utiliza o endpoint configurado em{" "}
                    <Link to="/events/settings?tab=webhooks" className="text-primary hover:underline inline-flex items-center gap-0.5">
                      Configurações &gt; Webhooks
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="custom" id="wh-custom" className="mt-0.5" />
                <div>
                  <Label htmlFor="wh-custom" className="text-sm font-medium cursor-pointer">
                    Webhook customizado
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Define um endpoint exclusivo para este evento, ignorando o padrão.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Webhook config — only when custom */}
        {webhookMode === "custom" ? (
          <WebhookSimulator />
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Este evento está usando o webhook padrão.{" "}
                <Link to="/events/settings?tab=webhooks" className="text-primary hover:underline">
                  Ver configuração
                </Link>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </HubLayout>
  );
}
