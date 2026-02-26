/**
 * BaselineEndlineChart — Line/area: evolution before/after
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { BASELINE_ENDLINE_MOCK } from "../../mocks/brand-metrics";

export function BaselineEndlineChart() {
  const data = BASELINE_ENDLINE_MOCK.map((m) => ({
    metric: m.metric,
    Baseline: m.baseline,
    Endline: m.endline,
    Delta: m.delta,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Evolução Baseline vs Endline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="metric" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-15} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="Baseline" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
            <Bar dataKey="Endline" fill="hsl(210, 80%, 45%)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="Delta" position="top" formatter={(v: number) => `+${v}pp`} style={{ fontSize: 10, fill: "hsl(142, 71%, 35%)" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
