/**
 * ParticipantDetail — Detailed profile of a participant
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Building2, Briefcase } from "lucide-react";
import { EVENTS_MOCK } from "../../mocks/events";
import { useEventsContext } from "../../context/EventsContext";
import type { Participant } from "../../types";

const eventMap = new Map(EVENTS_MOCK.map((e) => [e.id, e]));

export function ParticipantDetail({ participant }: { participant: Participant }) {
  const { opportunities } = useEventsContext();
  const participantOpps = opportunities.filter((o) => o.participantId === participant.id);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-1.5">
        <Link to="/events/participants">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center pb-3 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-xl font-bold text-primary">
                  {participant.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <h2 className="font-semibold text-foreground">{participant.fullName}</h2>
              <Badge variant="secondary" className="text-[10px] mt-1">{participant.code}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> {participant.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {participant.phone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> {participant.city}/{participant.uf}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" /> {participant.jobTitle}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" /> {participant.companyName} ({participant.companyType})
              </div>
            </div>
            <Badge variant="outline" className="text-xs">{participant.operationArea}</Badge>
          </CardContent>
        </Card>

        {/* Events & opportunities */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Eventos Participados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {participant.eventIds.map((eid) => {
              const evt = eventMap.get(eid);
              return evt ? (
                <div key={eid} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{evt.name}</p>
                    <p className="text-xs text-muted-foreground">{evt.city}/{evt.uf} • {new Date(evt.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge variant={participant.attendedAt ? "secondary" : "outline"} className="text-[10px]">
                    {participant.attendedAt ? "Presente" : "Inscrito"}
                  </Badge>
                </div>
              ) : null;
            })}
          </CardContent>

          {participantOpps.length > 0 && (
            <>
              <CardHeader className="pb-3 pt-0">
                <CardTitle className="text-sm">Oportunidades Registradas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {participantOpps.map((opp) => (
                  <div key={opp.id} className="py-2 px-3 rounded-lg border border-border">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {opp.areasOfInterest.map((a) => (
                        <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                      ))}
                    </div>
                    {opp.observations && (
                      <p className="text-xs text-muted-foreground">{opp.observations}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Capturada em {new Date(opp.capturedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
