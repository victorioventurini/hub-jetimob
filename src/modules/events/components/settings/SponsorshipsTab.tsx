/**
 * SponsorshipsTab — Lista de eventos com cotas de patrocínio (conteúdo original do EventsSettingsPage)
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MapPin, ChevronRight, Settings } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { EVENT_SETTINGS_MOCK, type QuotaName } from "../../mocks/eventSettings";

const QUOTA_VARIANT: Record<QuotaName, string> = {
  Diamante: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  Esmeralda: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Ouro: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Prata: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function SponsorshipsTab() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Evento</TableHead>
              <TableHead className="text-xs">Localização</TableHead>
              <TableHead className="text-xs text-center">
                Projetado
                <HelpTooltip content="Público estimado/projetado para o evento antes da realização." size="sm" />
              </TableHead>
              <TableHead className="text-xs text-center">Inscritos</TableHead>
              <TableHead className="text-xs text-center">Participantes</TableHead>
              <TableHead className="text-xs">
                Cota
                <HelpTooltip content="Nível de patrocínio contratado para o evento (Diamante, Esmeralda, Ouro ou Prata), que define visibilidade e benefícios." size="sm" />
              </TableHead>
              <TableHead className="text-xs w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {EVENT_SETTINGS_MOCK.map((evt) => (
              <TableRow key={evt.id} className="group">
                <TableCell>
                  <Link
                    to={`/events/settings/${evt.id}`}
                    className="font-medium text-sm hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    {evt.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {new Date(evt.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {evt.city}, {evt.uf}
                  </span>
                </TableCell>
                <TableCell className="text-center text-sm font-medium">
                  {evt.projectedAudience.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {evt.totalRegistrations.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {evt.totalAttendees.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-semibold ${QUOTA_VARIANT[evt.quota]}`}
                  >
                    {evt.quota}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link to={`/events/settings/${evt.id}`}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
