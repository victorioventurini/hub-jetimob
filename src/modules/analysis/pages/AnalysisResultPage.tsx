/**
 * AnalysisResultPage — visualização da análise gerada
 */
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useAnalysisReport } from "../hooks/useAnalysisReport";
import { useIdentity } from "@/hooks/useIdentity";
import { useAuth } from "@/hooks/useAuth";
import { LoadingRotativo } from "../components/LoadingRotativo";
import { ResultHeader } from "../components/result/ResultHeader";
import { KeyMetricsGrid } from "../components/result/KeyMetricsGrid";
import { InsightBlock } from "../components/result/InsightBlock";
import { AnalysisBody } from "../components/result/AnalysisBody";
import { SourcesChips } from "../components/result/SourcesChips";
import { SuggestedActions } from "../components/result/SuggestedActions";
import { AnalysisCommentList } from "../components/result/AnalysisCommentList";
import { AnalysisFeedback } from "../components/feedback/AnalysisFeedback";
import { ShareDialog } from "../components/ShareDialog";

export default function AnalysisResultPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { data: report, isLoading, error } = useAnalysisReport(reportId);
  const { realProfileId } = useIdentity();
  const { isAdmin } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <LoadingRotativo />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
        <p className="mt-2 text-sm text-muted-foreground">
          Análise não encontrada ou sem permissão de acesso.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/analysis">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  const canDelete = isAdmin || report.created_by === realProfileId;
  const isGenerating = report.status === "generating" || report.status === "pending";
  const insights = report.result?.insights ?? [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link to="/analysis">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <ResultHeader
        report={report}
        onShare={() => setShareOpen(true)}
        canDelete={canDelete}
      />

      {isGenerating && (
        <Card className="mt-6">
          <LoadingRotativo />
        </Card>
      )}

      {report.status === "failed" && (
        <Card className="mt-6 border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-foreground">Falha ao gerar análise</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.error_message || "Erro desconhecido. Tente gerar novamente."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {report.status === "complete" && report.result && (
        <div className="mt-6 space-y-6">
          <KeyMetricsGrid metrics={report.result.key_metrics} />

          {insights.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Insights</h2>
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <InsightBlock key={`${ins.title}-${i}`} insight={ins} />
                ))}
              </div>
            </div>
          )}

          <AnalysisBody body={report.result.body} />

          <SuggestedActions actions={report.suggested_actions ?? undefined} />

          <SourcesChips sources={report.sources ?? report.result.sources ?? undefined} />

          <AnalysisFeedback reportId={report.id} />

          <AnalysisCommentList reportId={report.id} />
        </div>
      )}

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} reportId={report.id} />
    </div>
  );
}
