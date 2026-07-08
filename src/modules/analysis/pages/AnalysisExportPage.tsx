/**
 * AnalysisExportPage — exportação de performance da BU em .xlsx multi-abas.
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBu } from "@/contexts/BuContext";
import { useAnalysisExport } from "../hooks/useAnalysisExport";
import { format } from "date-fns";

const TABS = [
  "Overview",
  "KPIs — Definições",
  "KPIs — Inputs",
  "OKRs — Ciclos",
  "OKRs — Objetivos",
  "OKRs — KRs",
  "OKRs — Check-ins",
  "Projetos",
  "Projetos — Milestones",
];

export default function AnalysisExportPage() {
  usePageTitle("Exportar Performance da BU");
  const { currentBu } = useBu();
  const { generate, isGenerating, lastSummary } = useAnalysisExport();
  const year = new Date().getFullYear();
  const periodLabel = `${year} YTD — 01/01 → ${format(new Date(), "dd/MM")}`;

  return (
    <HubLayout>
      <div className="w-full min-w-0 space-y-6 overflow-x-hidden">
        <PageHeader
          title="Exportar Performance da BU"
          description="Gera uma planilha (.xlsx) multi-abas com KPIs, OKRs e Projetos da BU ativa, pronta para análise externa (ex.: Claude)."
          breadcrumbs={[
            { label: "Análise Estratégica", href: "/analysis" },
            { label: "Exportar" },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base">Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-4 pt-0 md:p-6 md:pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Business Unit
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {currentBu?.name ?? "Selecione uma BU"}
                  </Badge>
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Período
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {periodLabel}
                  </Badge>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Abas incluídas
                </div>
                <div className="flex flex-wrap gap-2">
                  {TABS.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={generate}
                  disabled={!currentBu || isGenerating}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando planilha…
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Gerar planilha (.xlsx)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4" />
                Última exportação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              {!lastSummary ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma exportação nesta sessão. Ao gerar, o download começa
                  automaticamente e um resumo aparece aqui.
                </p>
              ) : (
                <dl className="space-y-2 text-sm">
                  <Row label="KPIs" value={`${lastSummary.kpis.definitions.length} defs • ${lastSummary.kpis.inputs.length} inputs`} />
                  <Row label="OKRs" value={`${lastSummary.okrs.objectives.length} obj • ${lastSummary.okrs.keyResults.length} KRs • ${lastSummary.okrs.checkins.length} check-ins`} />
                  <Row label="Projetos" value={`${lastSummary.projects.projects.length} projetos • ${lastSummary.projects.milestones.length} milestones`} />
                  <Row label="Ciclos" value={`${lastSummary.okrs.cycles.length}`} />
                </dl>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </HubLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/50 pb-1 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
