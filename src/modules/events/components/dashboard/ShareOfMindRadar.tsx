/**
 * ShareOfMindRadar — Radar chart: sponsor vs market average
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { SHARE_OF_MIND_MOCK } from "../../mocks/brand-metrics";

export function ShareOfMindRadar() {
  const navigate = useNavigate();
  const data = SHARE_OF_MIND_MOCK.map((d) => ({
    dimension: d.dimension,
    "Porto Seguro": d.sponsorScore,
    "Média do Mercado": d.marketAverage,
  }));

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/events/participants")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Share of Mind</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar name="Porto Seguro" dataKey="Porto Seguro" stroke="hsl(210, 80%, 45%)" fill="hsl(210, 80%, 45%)" fillOpacity={0.3} />
            <Radar name="Média do Mercado" dataKey="Média do Mercado" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
