/**
 * AnalysisResultPage — visualização do report gerado
 */
import { memo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Info,
  Share2,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAnalysisComments } from "../hooks/useAnalysisComments";
import { useAnalysisReport } from "../hooks/useAnalysisReport";
import { AnalysisFeedback } from "../components/feedback/AnalysisFeedback";
import { ShareDialog } from "../components/ShareDialog";
import { LoadingRotativo } from "../components/LoadingRotativo";
import type {
  AnalysisComment,
  AnalysisInsight,
  AnalysisKeyMetric,
  AnalysisReport,
  AnalysisSource,
  AnalysisSuggestedAction,
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

function ResultHeader({
  report,
  onShare,
  onDelete,
  canDelete,
}: {
  report: AnalysisReport;
  onShare: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const status = STATUS_LABEL[report.status] ?? STATUS_LABEL.pending;
  const title = report.result?.title || report.title || report.premise.slice(0, 80);

  return (
    <div className="space-y-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold leading-tight text-foreground">{title}</h1>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{report.premise}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {report.status === "complete" && (
            <Button size="sm" variant="outline" onClick={onShare}>
              <Share2 className="mr-1.5 h-4 w-4" />
              Compartilhar
            </Button>
          )}
          {canDelete && onDelete && (
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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

function SuggestedActions({ actions }: { actions?: AnalysisSuggestedAction[] }) {
  if (!actions?.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <CheckCircle2 className="h-5 w-5 text-success" />
        Ações sugeridas
      </h2>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <div
            key={`${action.title}-${index}`}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
          >
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{action.title}</p>
              {action.rationale ? (
                <p className="mt-1 text-xs text-muted-foreground">{action.rationale}</p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {action.owner_hint ? <span>Responsável sugerido: {action.owner_hint}</span> : null}
                {action.due_hint ? <span>Prazo: {action.due_hint}</span> : null}
              </div>
            </div>
            <Button size="sm" variant="outline" disabled title="Em breve: criar decisão formal">
              Registrar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisCommentList({ reportId }: { reportId: string }) {
  const { data: comments = [], isLoading, add, isAdding } = useAnalysisComments(reportId);
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    add(trimmed);
    setText("");
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Discussão</h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando comentários…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment: AnalysisComment) => {
            const initials = (comment.author?.display_name || "?")
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <li key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.author?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">
                      {comment.author?.display_name || "Usuário"}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2 border-t border-border pt-3">
        <Textarea
          placeholder="Adicione um comentário…"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          maxLength={2000}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!text.trim() || isAdding}>
            Comentar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisResultPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading } = useAnalysisReport(reportId);
  const [shareOpen, setShareOpen] = useState(false);

  usePageTitle(report?.title || report?.premise?.slice(0, 60) || "Análise");

  if (isLoading || !report) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/analysis")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="p-6">
            <LoadingRotativo />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGenerating = report.status === "generating" || report.status === "pending";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/analysis")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardContent className="space-y-6 p-6">
          <ResultHeader report={report} onShare={() => setShareOpen(true)} />

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
              <SuggestedActions actions={report.suggested_actions ?? undefined} />
            </>
          )}
        </CardContent>
      </Card>

      {report.status === "complete" && (
        <>
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
