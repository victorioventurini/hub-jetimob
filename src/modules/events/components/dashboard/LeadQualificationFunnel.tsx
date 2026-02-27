/**
 * LeadQualificationFunnel — uses jetExperienceMetrics.ts for consistent numbers
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { useEventsContext } from "../../context/EventsContext";
import { PARTICIPANTS_FULL_MOCK } from "../../mocks/participantsFull";
import { JOURNEYS_MOCK } from "../../mocks/events";
// EVENT_TOTALS not needed after removing Contratos stage

export function LeadQualificationFunnel() {
  const { filteredEvents, filters } = useEventsContext();
  const navigate = useNavigate();

  const { totalRegistrations, totalAttendees, totalLeads, totalOpps } = useMemo(() => {
    const regs = filteredEvents.reduce((s, e) => s + e.totalRegistrations, 0);
    const atts = filteredEvents.reduce((s, e) => s + e.totalAttendees, 0);

    // Derive lead/opp counts from PARTICIPANTS_FULL_MOCK with same scope filter
    let data = PARTICIPANTS_FULL_MOCK.filter((p) => p.year === filters.year);
    if (filters.scope === "event" && filters.selectedEventId) {
      data = data.filter((p) => p.eventIds.includes(filters.selectedEventId!));
    }
    if (filters.scope === "journey" && filters.selectedJourneyId) {
      const journey = JOURNEYS_MOCK.find((j) => j.id === filters.selectedJourneyId);
      if (journey) {
        data = data.filter((p) => p.eventIds.some((eid) => journey.eventIds.includes(eid)));
      }
    }

    const leads = data.filter((p) => p.statusInscricao === "lead" || p.statusInscricao === "oportunidade").length;
    const opps = data.filter((p) => p.statusInscricao === "oportunidade").length;

    return { totalRegistrations: regs, totalAttendees: atts, totalLeads: leads, totalOpps: opps };
  }, [filteredEvents, filters]);

  const stages = [
    { label: "Inscritos", value: totalRegistrations, color: "bg-blue-100 text-blue-800" },
    { label: "Participantes", value: totalAttendees, color: "bg-indigo-100 text-indigo-800" },
    { label: "Leads", value: totalLeads, color: "bg-violet-100 text-violet-800" },
    { label: "Oportunidades", value: totalOpps, color: "bg-amber-100 text-amber-800" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Funil de Qualificação
          <HelpTooltip content="Mostra a jornada de conversão: Inscritos → Participantes → Leads → Oportunidades → Contratos. O percentual entre etapas indica a taxa de conversão." size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, i) => {
          const widthPct = totalRegistrations > 0 ? Math.max(12, (stage.value / totalRegistrations) * 100) : 12;
          const conversionPct = i > 0 ? Math.round((stage.value / stages[i - 1].value) * 100) : 100;
          return (
            <div
              key={stage.label}
              className="cursor-pointer group"
              onClick={() => navigate("/events/participants")}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{stage.value.toLocaleString("pt-BR")}</span>
                  {i > 0 && (
                    <span className="text-xs text-muted-foreground">({conversionPct}%)</span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-muted rounded-md overflow-hidden">
                <div
                  className={`h-full rounded-md ${stage.color} flex items-center justify-center transition-all duration-500 group-hover:opacity-80`}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="text-xs font-semibold">{stage.value.toLocaleString("pt-BR")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
