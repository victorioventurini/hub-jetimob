/**
 * BrandRecallLeadsOverlap — Comparative bars: brand recall × qualified leads
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAnonymize } from "../../hooks/useAnonymize";
import { BRAND_RECALL_MOCK } from "../../mocks/brand-metrics";

export function BrandRecallLeadsOverlap() {
  const { getDisplayName } = useAnonymize();
  const navigate = useNavigate();
  // Mock: leads qualificados correlacionados com recall
  const data = BRAND_RECALL_MOCK.map((b) => ({
    brand: getDisplayName(b.brandId),
    "Brand Recall": b.stimulated,
    "Leads Qualificados": Math.round(b.stimulated * (0.3 + Math.random() * 0.25)),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Brand Recall × Leads Qualificados</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="brand" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Brand Recall" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={() => navigate("/events/participants")} />
            <Bar dataKey="Leads Qualificados" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={() => navigate("/events/participants")} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
