import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Target, TrendingUp, GitBranch, Info } from "lucide-react";
import { OKR_LIMITS } from "../../utils/linkingRules";

export function LimitsTab() {
  const limits = [
    {
      icon: Target,
      title: "Objetivos por Time",
      value: OKR_LIMITS.MAX_OBJECTIVES_PER_TEAM,
      description: "Número máximo de objetivos ativos simultaneamente por time",
      rationale:
        "Limitar objetivos mantém o foco do time. Muitos objetivos dispersam esforços e reduzem a chance de alcançar resultados significativos.",
      enforcement: "Validado no banco de dados (trigger)",
    },
    {
      icon: TrendingUp,
      title: "Key Results por Objetivo",
      value: OKR_LIMITS.MAX_KRS_PER_OBJECTIVE,
      description: "Número máximo de KRs ativos por objetivo",
      rationale:
        "Cada objetivo deve ter poucos KRs bem definidos. Mais de 3 KRs indica que o objetivo pode estar amplo demais.",
      enforcement: "Validado no banco de dados (trigger)",
    },
    {
      icon: GitBranch,
      title: "Contribuições por KR",
      value: OKR_LIMITS.MAX_CONTRIBUTIONS_PER_KR,
      description: "Número máximo de entidades que um KR pode contribuir",
      rationale:
        "Um KR deve ter foco claro. Contribuir para muitos objetivos indica falta de priorização.",
      enforcement: "Validado no banco de dados (trigger)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Limites da Metodologia</h2>
        <p className="text-sm text-muted-foreground">
          Limites baseados nas melhores práticas de OKR para manter foco e clareza
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-info/30 bg-info-muted">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-info mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-info-muted-foreground">
                Por que limites são importantes?
              </p>
              <p className="text-info-muted-foreground mt-1">
                A metodologia OKR recomenda foco rigoroso. Pesquisas mostram que times com
                menos objetivos têm maior taxa de sucesso. Os limites ajudam a priorizar
                o que realmente importa.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limits Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {limits.map((limit) => {
          const Icon = limit.icon;
          return (
            <Card key={limit.title}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold px-3">
                    {limit.value}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-3">{limit.title}</CardTitle>
                <CardDescription>{limit.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Justificativa:</strong>{" "}
                    {limit.rationale}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" />
                  <span>{limit.enforcement}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancellation Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre Cancelamentos</CardTitle>
          <CardDescription>
            Como os limites funcionam com OKRs cancelados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-success mt-1">✓</span>
              <span>
                <strong className="text-foreground">KRs cancelados não contam:</strong>{" "}
                Quando uma KR é cancelada (com motivo registrado), ela não é contabilizada
                no limite de 3 KRs por objetivo.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-1">✓</span>
              <span>
                <strong className="text-foreground">Objetivos cancelados não contam:</strong>{" "}
                Objetivos com status 'cancelled' ou 'discarded' não são contabilizados
                no limite de 3 objetivos por time.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-warning mt-1">!</span>
              <span>
                <strong className="text-foreground">Histórico preservado:</strong>{" "}
                Mesmo cancelados, os registros permanecem para aprendizado e auditoria.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
