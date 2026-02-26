/**
 * OpportunitiesVolumeChart — Bar chart: volume by event/journey
 * Clicking any bar navigates to /events/participants
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { EVENTS_MOCK } from "../../mocks/events";
import { useEventsContext } from "../../context/EventsContext";

export function OpportunitiesVolumeChart() {
  const { opportunities } = useEventsContext();
  const navigate = useNavigate();

  const data = EVENTS_MOCK.map((evt) => ({
    event: evt.name.replace("Jet Experience ", ""),
    total: opportunities.filter((o) => o.eventId === evt.id).length,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Volume de Oportunidades por Evento
          <HelpTooltip content="Quantidade total de oportunidades capturadas em cada evento, permitindo comparar a performance de geração de leads entre os eventos." size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="event" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="total"
              fill="hsl(210, 80%, 45%)"
              radius={[4, 4, 0, 0]}
              name="Oportunidades"
              cursor="pointer"
              onClick={() => navigate("/events/participants")}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
