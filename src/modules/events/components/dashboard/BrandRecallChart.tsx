/**
 * BrandRecallChart — Grouped bars: spontaneous vs stimulated recall
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BRAND_RECALL_MOCK } from "../../mocks/brand-metrics";
import { useAnonymize } from "../../hooks/useAnonymize";

export function BrandRecallChart() {
  const { getDisplayName } = useAnonymize();
  const navigate = useNavigate();
  const data = BRAND_RECALL_MOCK.map((b) => ({
    brand: getDisplayName(b.brandId),
    Espontâneo: b.spontaneous,
    Estimulado: b.stimulated,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Brand Recall — Espontâneo vs Estimulado</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="brand" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Espontâneo" fill="hsl(210, 80%, 45%)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={() => navigate("/events/participants")} />
            <Bar dataKey="Estimulado" fill="hsl(210, 80%, 65%)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={() => navigate("/events/participants")} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
