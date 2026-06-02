/**
 * AnalysisResultPage — visualização do report gerado.
 *
 * Componentes do bloco resultado vivem em `components/result-blocks/`:
 * header, métricas, insights, ações sugeridas, decisões registradas e discussão.
 */
import { memo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Info,
  MessageSquare,
  RefreshCw,
  Share2,
  Trash2,
  Wand2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TextareaAutoSubmit } from "@/components/ui/textarea-auto-submit";
import { cn } from "@/lib/utils";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBu } from "@/contexts/BuContext";
import { useAnalysisReport } from "../hooks/useAnalysisReport";
import { useGenerateAnalysis } from "../hooks/useGenerateAnalysis";
import { useDeleteAnalysisReport } from "../hooks/useDeleteAnalysisReport";
import { AnalysisFeedback } from "../components/feedback/AnalysisFeedback";
import { ShareDialog } from "../components/ShareDialog";
import { LoadingRotativo } from "../components/LoadingRotativo";
import { ConfirmActionDialog } from "@/modules/assessments/components/ConfirmActionDialog";
import { useAnalysisComments } from "../hooks/useAnalysisComments";
import { useAnalysisDecisions } from "../hooks/useAnalysisDecisions";
import type {
  AnalysisComment,
  AnalysisInsight,
  AnalysisKeyMetric,
  AnalysisReport,
  AnalysisSource,
  AnalysisSuggestedAction,
} from "../types";
import type { TeamCheckinDecision } from "@/modules/okrs/types/wizard";

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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SuggestedActionsSection({
  actions,
  reportId,
  ownerHint,
}: {
  actions?: AnalysisSuggestedAction[];
  reportId: string;
  ownerHint: { id: string; name: string } | null;
}) {
  const { add, isAdding } = useAnalysisDecisions(reportId);
  const items = actions ?? [];

  if (!items.length) return null;

  const categoryMap: Record<string, TeamCheckinDecision["category"]> = {
    decision: "decision",
    focus_adjustment: "focus_adjustment",
    next_step: "next_step",
    strategic_proposal: "strategic_proposal",
  };

  const registerDecision = (action: AnalysisSuggestedAction) => {
    const text = (action.suggestedText || action.label || "").trim();
    if (!text) return;

    add({
      id: crypto.randomUUID(),
      text,
      category: categoryMap[action.suggestedCategory || "decision"] || "decision",
      owner: ownerHint ?? undefined,
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Ações sugeridas</h2>
      </div>

      <div className="space-y-3">
        {items.map((action, index) => {
          const title = action.label || "Ação sugerida";
          const description =
            action.suggestedText || "Sem detalhes adicionais para esta sugestão.";
          const isDecision = action.type === "register_decision";

          return (
            <div key={`${title}-${index}`} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <Badge variant="outline">{isDecision ? "Decisão" : action.type || "Ação"}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>

                {isDecision ? (
                  <Button size="sm" variant="outline" onClick={() => registerDecision(action)} disabled={isAdding}>
                    {isAdding ? "Registrando…" : "Registrar decisão"}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AnalysisDecisionsSection({ reportId }: { reportId: string }) {
  const { decisions, isLoading } = useAnalysisDecisions(reportId);

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Decisões registradas</h2>
          <Badge variant="secondary" className="ml-auto">
            {decisions.length}
          </Badge>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando decisões…</p>
        ) : decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma decisão registrada para esta análise.</p>
        ) : (
          <div className="space-y-3">
            {decisions.map((decision) => (
              <div key={decision.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{decision.category}</Badge>
                  {decision.owner?.name ? (
                    <span className="text-xs text-muted-foreground">Responsável: {decision.owner.name}</span>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{decision.text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommentItem({ comment }: { comment: AnalysisComment }) {
  const authorName = comment.author?.display_name?.trim() || "Usuário";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={comment.author?.avatar_url ?? undefined} alt={authorName} />
          <AvatarFallback>{getInitials(authorName) || "?"}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
            </span>
            {comment.is_pinned ? <Badge variant="outline">Fixado</Badge> : null}
          </div>

          {comment.reply_to?.body ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Respondendo a {comment.reply_to.author?.display_name || "comentário"}: {comment.reply_to.body}
            </div>
          ) : null}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{comment.body}</p>
        </div>
      </div>
    </div>
  );
}

function AnalysisCommentSection({ reportId }: { reportId: string }) {
  const { data, isLoading, add, isAdding } = useAnalysisComments(reportId);
  const [body, setBody] = useState("");
  const comments = data ?? [];

  const submitComment = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    add({ body: trimmed });
    setBody("");
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Discussão</h2>
        <Badge variant="secondary" className="ml-auto">
          {comments.length}
        </Badge>
      </div>

      <div className="space-y-2">
        <TextareaAutoSubmit
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onSubmit={submitComment}
          minRows={2}
          maxRows={6}
          placeholder="Adicione um comentário…"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submitComment} disabled={!body.trim() || isAdding}>
            {isAdding ? "Enviando…" : "Comentar"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando comentários…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
        ) : (
          comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)
        )}
      </div>
    </section>
  );
}

export default function AnalysisResultPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading } = useAnalysisReport(reportId);
  const { currentBuId } = useBu();
  const [shareOpen, setShareOpen] = useState(false);
  const generate = useGenerateAnalysis();
  const deleteReport = useDeleteAnalysisReport();

  const handleDelete = async () => {
    if (!report) return;
    await deleteReport.mutateAsync(report.id);
    navigate("/analysis");
  };

  const handleRegenerate = async () => {
    if (!report) return;
    const result = await generate.mutateAsync({
      premise: report.premise,
      additional_context: report.additional_context ?? undefined,
      mode: report.mode,
      modules: report.mode === "auto" ? [] : (report.modules ?? []),
      scope: report.scope ?? {},
      period: report.period,
      depth: report.depth,
      template_id: report.template_id ?? undefined,
      title: report.title ?? undefined,
    });
    if (result?.report_id) navigate(`/analysis/${result.report_id}`);
  };

  usePageTitle(report?.title || report?.premise?.slice(0, 60) || "Análise");

  if (isLoading || !report) {
    return (
      <HubLayout>
        <div className="w-full min-w-0 space-y-6 overflow-x-hidden">
          <PageHeader title="Análise" backTo="/analysis" />
          <Card>
            <CardContent className="p-6">
              <LoadingRotativo />
            </CardContent>
          </Card>
        </div>
      </HubLayout>
    );
  }

  // BU SCOPE GUARD (defense-in-depth): se o cache servir uma análise de outra BU,
  // recusa renderização enquanto a BU ativa for diferente.
  if (currentBuId && report.bu_id && report.bu_id !== currentBuId) {
    return (
      <HubLayout>
        <div className="w-full min-w-0 space-y-6 overflow-x-hidden">
          <PageHeader title="Análise de outra BU" backTo="/analysis" backLabel="Voltar para Análises" />
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-base font-medium text-foreground">
                Essa análise pertence a outra BU 🔒
              </p>
              <p className="text-sm text-muted-foreground">
                Você está visualizando o Next em uma BU diferente da BU dessa análise.
                Selecione a BU correta no topo da tela para acessá-la.
              </p>
            </CardContent>
          </Card>
        </div>
      </HubLayout>
    );
  }

  const isGenerating = report.status === "generating" || report.status === "pending";
  const title = report.result?.title || report.title || report.premise.slice(0, 80);
  const ownerHint = report.author?.id
    ? { id: report.author.id, name: report.author.display_name ?? "Usuário" }
    : null;

  return (
    <HubLayout>
      <div className="w-full min-w-0 space-y-6 overflow-x-hidden">
        <PageHeader
          title={title}
          backTo="/analysis"
          backLabel="Voltar para Análises"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {report.status !== "generating" && report.status !== "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={generate.isPending}
              >
                <RefreshCw className={cn("mr-1.5 h-4 w-4", generate.isPending && "animate-spin")} />
                {generate.isPending ? "Regenerando…" : "Regenerar"}
              </Button>
            )}
            {report.status === "complete" && (
              <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
                <Share2 className="mr-1.5 h-4 w-4" />
                Compartilhar
              </Button>
            )}
            <ConfirmActionDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={deleteReport.isPending}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {deleteReport.isPending ? "Excluindo…" : "Excluir"}
                </Button>
              }
              title="Excluir análise?"
              description="Esta ação não pode ser desfeita. A análise será removida do histórico."
              confirmLabel="Excluir"
              onConfirm={handleDelete}
            />
          </div>
        }
      />

        <Card>
          <CardContent className="space-y-6 p-4 md:p-6">
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
                <SuggestedActionsSection
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
            <AnalysisDecisionsSection reportId={report.id} />
            <AnalysisFeedback reportId={report.id} />
            <Card>
              <CardContent className="p-4 md:p-6">
                <AnalysisCommentSection reportId={report.id} />
              </CardContent>
            </Card>
          </>
        )}

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} reportId={report.id} />
      </div>
    </HubLayout>
  );
}
