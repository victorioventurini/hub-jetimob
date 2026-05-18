/**
 * RunDetailPage — visualiza respostas + sinais anti-fraude + scoring automático de uma tentativa.
 */
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAnswers } from "../hooks/useAssessmentsData";
import { usePageTitle } from "@/hooks/usePageTitle";
import { SavedLinksPopover } from "@/shared/saved-links";
import { RunStatusBadge } from "../components/StatusBadges";

type Scoring =
  | { mode: "none" }
  | { mode: "exact" | "partial"; correct_option_ids?: string[] }
  | { mode: "scale_target"; target?: number; tolerance?: number };

type ChoiceOpt = { id: string; label: string };

function gradeChoice(scoring: Scoring, answerOptionIds: string[]): "correct" | "incorrect" | "partial" | "ungraded" {
  if (!scoring || scoring.mode === "none") return "ungraded";
  if (scoring.mode === "exact" || scoring.mode === "partial") {
    const correct = new Set(scoring.correct_option_ids ?? []);
    const given = new Set(answerOptionIds);
    if (correct.size === given.size && [...correct].every((id) => given.has(id))) return "correct";
    if (scoring.mode === "exact") return "incorrect";
    const overlap = [...given].filter((id) => correct.has(id)).length;
    if (overlap === 0) return "incorrect";
    return "partial";
  }
  return "ungraded";
}

function gradeScale(scoring: Scoring, value: number | undefined): "correct" | "incorrect" | "ungraded" {
  if (!scoring || scoring.mode !== "scale_target" || value === undefined) return "ungraded";
  const target = scoring.target ?? 0;
  const tolerance = scoring.tolerance ?? 0;
  return Math.abs(value - target) <= tolerance ? "correct" : "incorrect";
}

function GradeBadge({ status }: { status: "correct" | "incorrect" | "partial" | "ungraded" }) {
  if (status === "ungraded") return null;
  const map = {
    correct: { label: "Correta", icon: CheckCircle2, className: "bg-success/10 text-success border-success/30" },
    incorrect: { label: "Incorreta", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/30" },
    partial: { label: "Parcial", icon: MinusCircle, className: "bg-warning/10 text-warning border-warning/30" },
  } as const;
  const m = map[status];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={m.className}>
      <Icon className="h-3 w-3 mr-1" />{m.label}
    </Badge>
  );
}

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
        .select(
          "id, assessment_id, respondent_cpf, respondent_name, status, started_at, submitted_at, tab_switch_count, paste_attempt_count, copy_attempt_count, visibility_loss_seconds, fraud_signals, auto_score, objective_score, graded_at",
        )
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
        .select("id, prompt, help_text, question_type, time_limit_seconds, options, scoring, points")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });

  const qById = new Map((questions ?? []).map((q) => [q.id, q]));
  const fraud = (run?.tab_switch_count ?? 0) + (run?.paste_attempt_count ?? 0) + (run?.copy_attempt_count ?? 0);

  const respondent = run?.respondent_name || run?.respondent_cpf;
  usePageTitle(respondent ? `Tentativa de ${respondent}` : "Tentativa", {
    customDescription: "Resultado e respostas do participante, com sinais anti-fraude.",
  });

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title={run?.respondent_name || run?.respondent_cpf || "Tentativa"}
          breadcrumbs={[
            { label: "Assessments", href: "/assessments" },
            { label: "Prova", href: run?.assessment_id ? `/assessments/provas/${run.assessment_id}` : "/assessments" },
            { label: "Tentativa" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <SavedLinksPopover moduleSlug="assessments" />
              <Button variant="outline" asChild>
                <Link to={run?.assessment_id ? `/assessments/provas/${run.assessment_id}` : "/assessments"}>
                  <ArrowLeft className="h-4 w-4 mr-2" />Voltar
                </Link>
              </Button>
            </div>
          }
        />

        <Card>
          <CardContent className="p-4 grid gap-4 sm:grid-cols-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><RunStatusBadge status={run?.status} /></div></div>
            <div><p className="text-xs text-muted-foreground">Trocas de aba</p><p className="mt-1 font-medium">{run?.tab_switch_count ?? 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Tentativas de colar</p><p className="mt-1 font-medium">{run?.paste_attempt_count ?? 0}</p></div>
            <div><p className="text-xs text-muted-foreground">Tentativas de copiar</p><p className="mt-1 font-medium">{run?.copy_attempt_count ?? 0}</p></div>
          </CardContent>
        </Card>

        {run?.graded_at && (run.auto_score !== null || run.objective_score !== null) && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Score automático</p>
                <p className="mt-1 text-2xl font-semibold">{run.auto_score ?? "—"}{run.auto_score !== null && "%"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Score das objetivas</p>
                <p className="mt-1 text-2xl font-semibold">{run.objective_score ?? "—"}{run.objective_score !== null && "%"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Corrigido em</p>
                <p className="mt-1 font-medium">{new Date(run.graded_at).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Texto livre fica para correção manual.</p>
              </div>
            </CardContent>
          </Card>
        )}

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
            const scoring = (q?.scoring as Scoring | null) ?? { mode: "none" };
            let answerDisplay: React.ReactNode = "—";
            let grade: "correct" | "incorrect" | "partial" | "ungraded" = "ungraded";

            if (q?.question_type === "single_choice" || q?.question_type === "multiple_choice") {
              const ids: string[] = Array.isArray(a.answer_options) ? (a.answer_options as string[]) : [];
              const opts = (Array.isArray(q.options) ? (q.options as ChoiceOpt[]) : []);
              const labels = ids.map((id) => opts.find((o) => o.id === id)?.label ?? id);
              const correctIds = new Set(scoring.mode === "exact" || scoring.mode === "partial" ? scoring.correct_option_ids ?? [] : []);
              answerDisplay = labels.length > 0 ? (
                <ul className="space-y-1">
                  {ids.map((id, idx) => {
                    const isCorrectMark = correctIds.has(id);
                    return (
                      <li key={id} className="flex items-center gap-2 text-sm">
                        <span>{labels[idx]}</span>
                        {scoring.mode !== "none" && (
                          isCorrectMark
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            : <XCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : "—";
              grade = gradeChoice(scoring, ids);
            } else if (q?.question_type === "scale") {
              const v = a.answer_options && typeof a.answer_options === "object" && "value" in (a.answer_options as object)
                ? (a.answer_options as { value: number }).value
                : undefined;
              answerDisplay = v !== undefined ? `${v}` : "—";
              grade = gradeScale(scoring, v);
            } else {
              answerDisplay = <p className="whitespace-pre-wrap text-sm">{a.answer_text || "—"}</p>;
            }

            return (
              <Card key={a.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      Tempo: {a.time_spent_seconds}s
                      {scoring.mode !== "none" && q?.points && ` · ${q.points} pt`}
                    </p>
                    {a.paste_detected && <Badge variant="destructive">colou</Badge>}
                    <GradeBadge status={grade} />
                  </div>
                  <p className="font-medium">{q?.prompt ?? a.question_id}</p>
                  {q?.help_text && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{q.help_text}</p>}
                  <div className="bg-muted/40 rounded p-3">{answerDisplay}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </HubLayout>
  );
}
