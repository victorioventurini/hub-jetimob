/**
 * ShareOfMindRadar — Radar chart: Baseline vs Endline brand awareness
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SHARE_OF_MIND_MOCK } from "../../mocks/brand-metrics";

export function ShareOfMindRadar() {
  const navigate = useNavigate();

  const data = SHARE_OF_MIND_MOCK.map((d) => ({
    dimension: d.dimension,
    "Análise 1 (Baseline)": d.baseline,
    "Análise 2 (Endline)": d.endline,
  }));

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/events/participants")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Brand Awareness
          <HelpTooltip content="Mede a presença da marca na mente dos participantes em diferentes dimensões (confiança, inovação, custo-benefício, etc.), comparando Baseline (antes) com Endline (depois do evento)." size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={({ payload, x, y, textAnchor, ...rest }) => (
                <text
                  {...rest}
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  fontSize={11}
                  fill="hsl(var(--muted-foreground))"
                  fontWeight={payload.value === "Porto Seguro" ? 700 : 400}
                >
                  {payload.value}
                </text>
              )}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar name="Análise 1 (Baseline)" dataKey="Análise 1 (Baseline)" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeWidth={1} />
            <Radar name="Análise 2 (Endline)" dataKey="Análise 2 (Endline)" stroke="hsl(210, 80%, 45%)" fill="hsl(210, 80%, 45%)" fillOpacity={0.3} strokeWidth={2} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
