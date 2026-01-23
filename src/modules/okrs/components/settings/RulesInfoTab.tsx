import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowRight, Info } from "lucide-react";

export function RulesInfoTab() {
  const allowedLinks = [
    {
      from: "Objetivo de Time",
      to: "Objetivo Organizacional",
      description: "Mostra alinhamento estratégico do time com a organização",
    },
    {
      from: "KR de Time (contribution)",
      to: "KR Organizacional",
      description: "Contribui diretamente para a métrica organizacional",
    },
  ];

  const forbiddenLinks = [
    {
      from: "Objetivo Org",
      to: "Objetivo Org",
      reason: "Evita ciclos entre objetivos do mesmo nível",
    },
    {
      from: "KR Org",
      to: "Objetivo Org",
      reason: "KRs não vinculam diretamente a objetivos",
    },
    {
      from: "KR Time (enabler)",
      to: "KR Org",
      reason: "Enablers são internos ao time",
    },
    {
      from: "KR Time (foundational)",
      to: "KR Org",
      reason: "Fundacionais são pré-requisitos internos",
    },
    {
      from: "KR",
      to: "KR (mesmo nível)",
      reason: "Evita ciclos e dependências circulares",
    },
  ];

  const krTypes = [
    {
      type: "contribution",
      label: "Contribuição",
      color: "bg-status-green-muted text-status-green border-status-green/30",
      description: "Contribui diretamente para um KR organizacional",
      canLinkToOrg: true,
    },
    {
      type: "enabler",
      label: "Habilitador",
      color: "bg-status-blue-muted text-status-blue border-status-blue/30",
      description: "Habilita outros KRs do time a serem alcançados",
      canLinkToOrg: false,
    },
    {
      type: "foundational",
      label: "Fundacional",
      color: "bg-status-purple-muted text-status-purple border-status-purple/30",
      description: "Representa um pré-requisito fundamental do time",
      canLinkToOrg: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Regras de Vínculo</h2>
        <p className="text-sm text-muted-foreground">
          Entenda como objetivos e KRs podem se conectar na hierarquia
        </p>
      </div>

      {/* Allowed Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-status-green">
            <CheckCircle2 className="h-5 w-5" />
            Vínculos Permitidos
          </CardTitle>
          <CardDescription>
            Conexões válidas na estrutura de OKRs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allowedLinks.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border bg-status-green-muted border-status-green/30"
              >
                <Badge variant="outline" className="shrink-0">
                  {link.from}
                </Badge>
                <ArrowRight className="h-4 w-4 text-status-green shrink-0" />
                <Badge variant="outline" className="shrink-0">
                  {link.to}
                </Badge>
                <span className="text-sm text-muted-foreground ml-2">
                  {link.description}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Forbidden Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <XCircle className="h-5 w-5" />
            Vínculos Proibidos
          </CardTitle>
          <CardDescription>
            Conexões que não são permitidas para manter a hierarquia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {forbiddenLinks.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border bg-destructive/5 border-destructive/20"
              >
                <Badge variant="outline" className="shrink-0 text-muted-foreground">
                  {link.from}
                </Badge>
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                <Badge variant="outline" className="shrink-0 text-muted-foreground">
                  {link.to}
                </Badge>
                <span className="text-sm text-muted-foreground ml-2">
                  {link.reason}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KR Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5" />
            Tipos de Key Results
          </CardTitle>
          <CardDescription>
            Cada tipo tem regras específicas de vínculo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {krTypes.map((kr) => (
              <div
                key={kr.type}
                className="flex items-start gap-4 p-4 rounded-lg border"
              >
                <Badge className={kr.color}>{kr.label}</Badge>
                <div className="flex-1">
                  <p className="text-sm">{kr.description}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {kr.canLinkToOrg ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span className="text-success">
                          Pode vincular a KR organizacional
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-destructive">
                          Não pode vincular a KR organizacional
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Note */}
      <Card className="border-warning/30 bg-warning-muted/50 dark:border-warning/30 dark:bg-warning-muted/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-warning mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-warning-foreground dark:text-warning">
                Validação em múltiplas camadas
              </p>
              <p className="text-warning-muted-foreground dark:text-warning/80 mt-1">
                As regras de vínculo são validadas no frontend (para feedback imediato),
                no backend (edge function) e no banco de dados (triggers). Isso garante
                consistência mesmo em caso de uso direto da API.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
