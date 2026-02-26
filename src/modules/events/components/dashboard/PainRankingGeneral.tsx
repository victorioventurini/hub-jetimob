/**
 * PainRankingGeneral — Ranking geral de dores mais citadas (todas, sem filtro de marca)
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";

const trendIcons = {
  up: <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />,
  down: <TrendingDown className="h-3.5 w-3.5 text-red-500" />,
  stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

const GENERAL_PAIN_RANKING = [
  { painPoint: "Receber muitos contatos, mas a maioria sem perfil de compra", percentage: 72, trend: "up" as const, rank: 1 },
  { painPoint: "Ter o cliente pronto, mas não encontrar o imóvel atualizado para ele", percentage: 64, trend: "up" as const, rank: 2 },
  { painPoint: "Perder vendas pela demora no primeiro atendimento ao lead", percentage: 58, trend: "stable" as const, rank: 3 },
  { painPoint: "Negócios que caem no final por reprovação de crédito ou garantia", percentage: 52, trend: "up" as const, rank: 4 },
  { painPoint: "Lentidão e burocracia para assinar contratos e fazer vistorias", percentage: 47, trend: "down" as const, rank: 5 },
  { painPoint: "Sentimento de estar desatualizado perante as novas tecnologias", percentage: 38, trend: "stable" as const, rank: 6 },
];

export function PainRankingGeneral() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Ranking de Dores Mais Citadas
          <HelpTooltip content="Ranking geral das principais dores e necessidades mencionadas pelos participantes, independente de associação com marca. Percentual de citações e tendência em relação ao período anterior." size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {GENERAL_PAIN_RANKING.map((pain) => (
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
