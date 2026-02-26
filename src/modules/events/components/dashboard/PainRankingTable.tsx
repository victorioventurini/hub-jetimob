/**
 * PainRankingTable — Ranking table of most cited pain points
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PAIN_RANKING_MOCK } from "../../mocks/brand-metrics";

const trendIcons = {
  up: <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />,
  down: <TrendingDown className="h-3.5 w-3.5 text-red-500" />,
  stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function PainRankingTable() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Ranking de Dores Mais Citadas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {PAIN_RANKING_MOCK.map((pain) => (
            <div
              key={pain.painPoint}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate("/events/participants")}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-6">#{pain.rank}</span>
                <span className="text-sm font-medium text-foreground">{pain.painPoint}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pain.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground w-10 text-right">{pain.percentage}%</span>
                {trendIcons[pain.trend]}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
