/**
 * LeadQualificationFunnel — Funnel: registrations > attendees > opportunities > high fit
 * Clicking any stage navigates to /events/participants
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENTS_MOCK } from "../../mocks/events";
import { useEventsContext } from "../../context/EventsContext";

export function LeadQualificationFunnel() {
  const { opportunities } = useEventsContext();
  const navigate = useNavigate();

  const totalRegistrations = EVENTS_MOCK.reduce((s, e) => s + e.totalRegistrations, 0);
  const totalAttendees = EVENTS_MOCK.reduce((s, e) => s + e.totalAttendees, 0);
  const totalOpps = opportunities.length;
  const highFit = opportunities.filter((o) => o.fitScore >= 75).length;

  const stages = [
    { label: "Inscritos", value: totalRegistrations, color: "bg-blue-100 text-blue-800" },
    { label: "Participantes", value: totalAttendees, color: "bg-indigo-100 text-indigo-800" },
    { label: "Oportunidades", value: totalOpps, color: "bg-violet-100 text-violet-800" },
    { label: "Fit Alto (≥75)", value: highFit, color: "bg-emerald-100 text-emerald-800" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Funil de Qualificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, i) => {
          const widthPct = totalRegistrations > 0 ? Math.max(15, (stage.value / totalRegistrations) * 100) : 15;
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
