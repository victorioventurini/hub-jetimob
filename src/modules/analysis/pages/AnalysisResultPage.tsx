/**
 * AnalysisResultPage — visualização do report gerado.
 *
 * Componentes do bloco resultado vivem em `components/result-blocks/`:
 * header, métricas, insights, ações sugeridas, decisões registradas e discussão.
 */
import { memo, useState } from "react";
import { useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  AnalysisCommentList,
  AnalysisDecisionsList,
  SuggestedActions,
} from "@/modules/analysis/components/result-blocks/index.ts";
import { useAnalysisReport } from "../hooks/useAnalysisReport";
import { AnalysisFeedback } from "../components/feedback/AnalysisFeedback";
import { ShareDialog } from "../components/ShareDialog";
import { LoadingRotativo } from "../components/LoadingRotativo";
import type {
  AnalysisInsight,
  AnalysisKeyMetric,
  AnalysisReport,
  AnalysisSource,
} from "../types";

const STATUS_LABEL: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  pending: { label: "Pendente", variant: "secondary" },
  generating: { label: "Gerando…", variant: "secondary" },
  complete: { label: "Concluída", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
};

function ReportSummary({ report }: { report: AnalysisReport }) {
  const status = STATUS_LABEL[report.status] ?? STATUS_LABEL.pending;
  const authorName = report.author?.display_name?.trim() || "Usuário";
  const initials = authorName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{report.premise}</p>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={report.author?.photo_url ?? undefined} alt={authorName} />
            <AvatarFallback className="text-[10px]">{initials || "?"}</AvatarFallback>
          </Avatar>
          <span className="text-foreground">{authorName}</span>
        </span>
        <span>•</span>
        <span>
          Criada{" "}
          {formatDistanceToNow(new Date(report.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
        <span>•</span>
        <span>Modo: {report.mode}</span>
        <span>•</span>
        <span>Profundidade: {report.depth}</span>
      </div>
    </div>
  );
}

const SourcesChips = memo(function SourcesChips({ sources }: { sources?: AnalysisSource[] }) {
  if (!sources?.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Fontes consultadas
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source, index) => (
          <Badge key={`${source.module}-${index}`} variant="outline" className="text-xs">
            <span className="font-medium">{source.module}</span>
            {source.label ? (
              <span className="ml-1 text-muted-foreground">· {source.label}</span>
            ) : null}
          </Badge>
        ))}
      </div>
    </div>
  );
});

const KeyMetricsGrid = memo(function KeyMetricsGrid({ metrics }: { metrics?: AnalysisKeyMetric[] }) {
  if (!metrics?.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={`${metric.label}-${index}`} className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {metric.label}
          </p>
          <p className="mt-1 text-xl font-semibold text-foreground">{metric.value}</p>
          {(metric.reference || metric.delta) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {metric.reference}
              {metric.delta ? (
                <span className="ml-1 font-medium text-foreground">({metric.delta})</span>
              ) : null}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
});

const INSIGHT_STYLES: Record<
  AnalysisInsight["type"],
  { icon: typeof Info; bg: string; text: string }
> = {
  info: { icon: Info, bg: "bg-primary/10", text: "text-primary" },
  warning: { icon: AlertTriangle, bg: "bg-warning/10", text: "text-warning" },
  positive: { icon: CheckCircle2, bg: "bg-success/10", text: "text-success" },
};

const InsightBlock = memo(function InsightBlock({ insight }: { insight: AnalysisInsight }) {
  const style = INSIGHT_STYLES[insight.type] ?? INSIGHT_STYLES.info;
  const Icon = style.icon;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", style.bg)}>
        <Icon className={cn("h-5 w-5", style.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{insight.body}</p>
      </div>
    </div>
  );
});

function AnalysisBody({ body }: { body?: string }) {
  if (!body?.trim()) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">Análise</h2>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{body}</div>
    </div>
  );
}

export default function AnalysisResultPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { data: report, isLoading } = useAnalysisReport(reportId);
  const [shareOpen, setShareOpen] = useState(false);

  usePageTitle(report?.title || report?.premise?.slice(0, 60) || "Análise");

  if (isLoading || !report) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Análise" backTo="/analysis" />
        <Card>
          <CardContent className="p-6">
            <LoadingRotativo />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGenerating = report.status === "generating" || report.status === "pending";
  const title = report.result?.title || report.title || report.premise.slice(0, 80);
  const ownerHint = report.author?.id
    ? { id: report.author.id, name: report.author.display_name ?? "Usuário" }
    : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title={title}
        backTo="/analysis"
        backLabel="Voltar para Análises"
        actions={
          report.status === "complete" ? (
            <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
              <Share2 className="mr-1.5 h-4 w-4" />
              Compartilhar
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="space-y-6 p-6">
          <ReportSummary report={report} />

          {isGenerating && <LoadingRotativo />}

          {report.status === "failed" && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Falha ao gerar análise</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.error_message || "Tente novamente em alguns instantes."}
                </p>
              </div>
            </div>
          )}

          {report.status === "complete" && (
            <>
              <SourcesChips sources={report.sources ?? undefined} />
              <KeyMetricsGrid metrics={report.result?.key_metrics} />
              {report.result?.summary && (
                <p className="text-sm leading-relaxed text-foreground">
                  {report.result.summary}
                </p>
              )}
              <div className="space-y-3">
                {report.result?.insights?.map((ins, i) => (
                  <InsightBlock key={i} insight={ins} />
                ))}
              </div>
              <AnalysisBody body={report.result?.body} />
              <SuggestedActions
                actions={report.suggested_actions ?? undefined}
                reportId={report.id}
                ownerHint={ownerHint}
              />
            </>
          )}
        </CardContent>
      </Card>

      {report.status === "complete" && (
        <>
          <AnalysisDecisionsList reportId={report.id} />
          <AnalysisFeedback reportId={report.id} />
          <Card>
            <CardContent className="p-6">
              <AnalysisCommentList reportId={report.id} />
            </CardContent>
          </Card>
        </>
      )}

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} reportId={report.id} />
    </div>
  );
}
