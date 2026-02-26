/**
 * PipelineRoiChart — Horizontal bars: estimated ROI by area of operation
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SPONSOR_MOCK } from "../../mocks/sponsor";
import { useEventsContext } from "../../context/EventsContext";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);

export function PipelineRoiChart() {
  const { opportunities } = useEventsContext();
  const navigate = useNavigate();
  // Count opps per area, multiply by LTV
  const areaMap = new Map<string, { opps: number; ltv: number }>();
  SPONSOR_MOCK.areasOfOperation.forEach((a) => {
    areaMap.set(a.subcategory, { opps: 0, ltv: a.ltvPerLead });
  });

  opportunities.forEach((opp) => {
    opp.areasOfInterest.forEach((area) => {
      const entry = areaMap.get(area);
      if (entry) entry.opps += 1;
    });
  });

  const data = Array.from(areaMap.entries())
    .map(([area, { opps, ltv }]) => ({
      area,
      roi: Math.round(opps * ltv * 0.35),
      opps,
    }))
    .filter((d) => d.opps > 0)
    .sort((a, b) => b.roi - a.roi);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Pipeline ROI Estimado por Área
          <HelpTooltip content="ROI estimado por área de atuação, calculado com base no número de oportunidades × LTV médio × taxa de conversão esperada (35%)." size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="area" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={140} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="roi" fill="hsl(142, 71%, 35%)" radius={[0, 4, 4, 0]} name="ROI Estimado" cursor="pointer" onClick={() => navigate("/events/participants")} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
