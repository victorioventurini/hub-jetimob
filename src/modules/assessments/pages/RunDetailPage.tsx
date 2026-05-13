/**
 * RunDetailPage — visualiza respostas + sinais anti-fraude de uma tentativa.
 */
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAnswers } from "../hooks/useAssessmentsData";

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  const { data: run } = useQuery({
    queryKey: ["assessments", "run", currentBuId, runId],
    enabled: !!runId && !!currentBuId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_runs")
        .select("id, assessment_id, respondent_cpf, respondent_name, status, started_at, submitted_at, tab_switch_count, paste_attempt_count, copy_attempt_count, visibility_loss_seconds, fraud_signals")
        .eq("id", runId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: answers } = useAnswers(runId);

  const { data: questions } = useQuery({
    queryKey: ["assessments", "run-questions", currentBuId, runId],
    enabled: !!answers && answers.length > 0,
    queryFn: async () => {
      const ids = answers!.map((a) => a.question_id);
      const { data, error } = await supabase
        .from("assessment_form_questions")
        .select("id, prompt, question_type, time_limit_seconds")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });

  const qById = new Map((questions ?? []).map((q) => [q.id, q]));
  const fraud = (run?.tab_switch_count ?? 0) + (run?.paste_attempt_count ?? 0) + (run?.copy_attempt_count ?? 0);

  const respondent = run?.respondent_name || run?.respondent_cpf;
  const metaTitle = respondent ? `${respondent} — Tentativa` : "Carregando tentativa…";
  const metaDescription = "Resultado e respostas do participante, com sinais anti-fraude.";

  return (
    <HubLayout>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
      </Helmet>
      <div className="space-y-6">
        <PageHeader
          title={run?.respondent_name || run?.respondent_cpf || "Tentativa"}
          breadcrumbs={[
            { label: "Assessments", href: "/assessments" },
            { label: "Prova", href: run?.assessment_id ? `/assessments/provas/${run.assessment_id}` : "/assessments" },
            { label: "Tentativa" },
          ]}
          actions={
            <Button variant="outline" asChild>
              <Link to={run?.assessment_id ? `/assessments/provas/${run.assessment_id}` : "/assessments"}>
                <ArrowLeft className="h-4 w-4 mr-2" />Voltar
              </Link>
            </Button>
          }
        />

        <Card>
          <CardContent className="p-4 grid gap-3 sm:grid-cols-4 text-sm">
            <div><p className="text-muted-foreground">Status</p><Badge variant={run?.status === "submitted" ? "default" : "secondary"}>{run?.status}</Badge></div>
            <div><p className="text-muted-foreground">Trocas de aba</p><p>{run?.tab_switch_count ?? 0}</p></div>
            <div><p className="text-muted-foreground">Tentativas de colar</p><p>{run?.paste_attempt_count ?? 0}</p></div>
            <div><p className="text-muted-foreground">Tentativas de copiar</p><p>{run?.copy_attempt_count ?? 0}</p></div>
          </CardContent>
        </Card>

        {fraud > 0 && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Sinais de risco detectados</p>
                <p className="text-muted-foreground">Considere os sinais ao avaliar as respostas. Eles não invalidam automaticamente o resultado.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {(answers ?? []).map((a) => {
            const q = qById.get(a.question_id);
            return (
              <Card key={a.id}>
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Tempo: {a.time_spent_seconds}s {a.paste_detected && <Badge variant="destructive" className="ml-2">colou</Badge>}</p>
                  <p className="font-medium">{q?.prompt ?? a.question_id}</p>
                  <p className="whitespace-pre-wrap text-sm bg-muted/40 rounded p-3">{a.answer_text || JSON.stringify(a.answer_options) || "—"}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </HubLayout>
  );
}
