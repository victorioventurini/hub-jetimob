/**
 * AnalysisResultPage — visualização do report gerado
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAnalysisReport } from "../hooks/useAnalysisReport";
import { ResultHeader } from "../components/result-blocks/ResultHeader";
import { SourcesChips } from "../components/result-blocks/SourcesChips";
import { KeyMetricsGrid } from "../components/result-blocks/KeyMetricsGrid";
import { InsightBlock } from "../components/result-blocks/InsightBlock";
import { AnalysisBody } from "../components/result-blocks/AnalysisBody";
import { SuggestedActions } from "../components/result-blocks/SuggestedActions";
import { AnalysisCommentList } from "../components/result-blocks/AnalysisCommentList";
import { AnalysisFeedback } from "../components/feedback/AnalysisFeedback";
import { ShareDialog } from "../components/ShareDialog";
import { LoadingRotativo } from "../components/LoadingRotativo";

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
