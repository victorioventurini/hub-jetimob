/**
 * ShareOfMindRadar — Radar chart: sponsor vs anonymized competitors
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SHARE_OF_MIND_MOCK } from "../../mocks/brand-metrics";
import { getBrandDisplayName, getBrandColor } from "../../utils/anonymize";
import { SPONSOR_BRAND_ID } from "../../mocks/sponsor";

export function ShareOfMindRadar() {
  const navigate = useNavigate();

  // Collect all unique brand IDs from the first dimension
  const brandIds = SHARE_OF_MIND_MOCK[0]?.scores.map((s) => s.brandId) ?? [];

  // Transform data: each dimension becomes a row with brandId-keyed scores
  const data = SHARE_OF_MIND_MOCK.map((d) => {
    const row: Record<string, string | number> = { dimension: d.dimension };
    for (const s of d.scores) {
      row[s.brandId] = s.score;
    }
    return row;
  });

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/events/participants")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Brand Awareness
          <HelpTooltip content="Mede a presença da marca na mente dos participantes em diferentes dimensões (confiança, inovação, custo-benefício, etc.), comparando com competidores anonimizados." size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            {brandIds.map((brandId) => (
              <Radar
                key={brandId}
                name={getBrandDisplayName(brandId, "sponsor")}
                dataKey={brandId}
                stroke={getBrandColor(brandId)}
                fill={getBrandColor(brandId)}
                fillOpacity={brandId === SPONSOR_BRAND_ID ? 0.3 : 0.05}
                strokeWidth={brandId === SPONSOR_BRAND_ID ? 2 : 1}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
