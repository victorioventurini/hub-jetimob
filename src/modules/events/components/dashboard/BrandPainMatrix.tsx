/**
 * BrandPainMatrix — Stacked 100% bars: brand × pain association
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BRAND_PAIN_MOCK } from "../../mocks/brand-metrics";
import { useAnonymize } from "../../hooks/useAnonymize";
import { SPONSOR_BRAND_ID, COMPETITORS_MOCK } from "../../mocks/sponsor";

export function BrandPainMatrix() {
  const { getDisplayName, getBrandColor } = useAnonymize();

  const allBrandIds = [SPONSOR_BRAND_ID, ...COMPETITORS_MOCK.map((c) => c.id)];

  const data = BRAND_PAIN_MOCK.map((pain) => {
    const row: Record<string, string | number> = { painPoint: pain.painPoint };
    pain.associations.forEach((a) => {
      row[getDisplayName(a.brandId)] = a.share;
    });
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Associação Marca × Dor (Share 100%)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="painPoint" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={120} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {allBrandIds.map((id) => (
              <Bar
                key={id}
                dataKey={getDisplayName(id)}
                stackId="stack"
                fill={getBrandColor(id)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
