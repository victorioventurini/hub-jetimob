/**
 * EventSettingDetailPage — Detalhe do evento + webhook config
 */
import { useParams, Navigate } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users } from "lucide-react";
import { WebhookSimulator } from "../components/opportunities/WebhookSimulator";
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

  if (!event) return <Navigate to="/events/settings" replace />;

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title={event.name}
          description="Configurações e webhook do evento"
          breadcrumbs={[
            { label: "Jet Experience", href: "/events" },
            { label: "Configurações", href: "/events/settings" },
            { label: event.name },
          ]}
        />

        {/* Event summary card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Resumo do Evento</CardTitle>
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

        {/* Webhook config */}
        <WebhookSimulator />
      </div>
    </HubLayout>
  );
}
