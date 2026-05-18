/**
 * AssessmentRunnerView — UI reutilizável do ambiente de prova.
 *
 * Consumida tanto pelo `PublicAssessmentRunner` (caminho público `/q/:token`)
 * quanto pela `AssessmentPreviewPage` (caminho admin `/assessments/provas/:id/preview`).
 *
 * Toda interação com backend passa pelo `RunnerApi` injetado — isso garante que o
 * modo preview não escreve nada (no-ops) sem precisar duplicar UI.
 *
 * Suporta múltiplos formatos de questão via `QuestionRenderer`:
 * short_text, long_text, single_choice, multiple_choice, scale.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck, CheckCircle2, Clock, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RunnerApi } from "../runner/runnerApi";
import { QuestionRenderer } from "./runner/QuestionRenderer";
import { isAnswered, type AnswerValue, type QuestionType } from "./runner/types";

export type RunnerQuestion = {
  id: string;
  position: number;
  question_type: QuestionType;
  prompt: string;
  help_text: string | null;
  required: boolean;
  time_limit_seconds: number;
  options: unknown;
};

export type RunnerForm = {
  form_id: string;
  title: string;
  description: string | null;
  level: number;
  position: number;
  version_id: string;
  questions: RunnerQuestion[];
};

export type RunnerLookup = {
  invite?: { id: string; status: string; invitee_name: string | null; invitee_cpf_masked: string; expires_at: string | null };
  assessment?: { id: string; title: string; description: string | null; default_total_time_seconds: number | null };
  forms?: RunnerForm[];
};

function buildOptionsPayload(type: QuestionType, value: AnswerValue): unknown {
  if (type === "single_choice" || type === "multiple_choice") {
    return value.option_ids ?? [];
  }
  if (type === "scale") {
    return value.scale_value !== undefined ? { value: value.scale_value } : null;
  }
  return null;
}

export function AssessmentRunnerView({
  lookup,
  api,
  isPreview = false,
}: {
  lookup: RunnerLookup;
  api: RunnerApi;
  isPreview?: boolean;
}) {
  const [stage, setStage] = useState<"identify" | "running" | "submitted">("identify");
  const [runId, setRunId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [cpf, setCpf] = useState(isPreview ? "00000000000" : "");
  const [name, setName] = useState(lookup.invite?.invitee_name ?? (isPreview ? "Pré-visualização" : ""));
  const [starting, setStarting] = useState(false);

  const questions = useMemo(() => {
    return (lookup.forms ?? []).flatMap((f) => f.questions.map((q) => ({ ...q, _formTitle: f.title })));
  }, [lookup.forms]);

  async function start() {
    setStarting(true);
    const res = await api.startRun({
      cpf,
      name: name || null,
      clientMeta: {
        ua: navigator.userAgent.slice(0, 200),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height}`,
      },
    });
    setStarting(false);
    if (!res.ok) {
      const code = res.error ?? "";
      const map: Record<string, { title: string; description?: string }> = {
        invite_submitted: { title: "Este questionário já foi respondido", description: "Se você acredita que isso é um engano, fale com quem te enviou o convite." },
        invite_expired: { title: "Convite expirado", description: "Solicite um novo convite a quem te enviou o link." },
        invite_cancelled: { title: "Convite cancelado", description: "Este convite foi cancelado. Solicite um novo." },
        invite_not_found: { title: "Convite não encontrado", description: "Confira o link com quem te convidou." },
        cpf_mismatch: { title: "CPF não confere", description: "Verifique o CPF informado e tente novamente." },
        cpf_required: { title: "Informe seu CPF para continuar" },
        invite_in_progress: { title: "Já existe uma tentativa em andamento", description: "Aguarde alguns minutos e tente novamente." },
      };
      const m = map[code] ?? { title: "Não foi possível iniciar", description: code || "Tente novamente em instantes." };
      toast.error(m.title, { description: m.description });
      return;
    }
    setRunId(res.runId);
    setExpiresAt(res.expiresAt);
    setStage("running");
  }

  if (stage === "identify") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {isPreview && <PreviewBanner />}
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{lookup.assessment?.title}</CardTitle>
            {lookup.assessment?.description && <p className="text-sm text-muted-foreground">{lookup.assessment.description}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded border bg-muted/40 p-3 text-sm space-y-2">
              <div className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 text-primary" /><div>
                <p className="font-medium">Este questionário é monitorado</p>
                <p className="text-muted-foreground">Trocas de aba, tentativas de copiar/colar e tempo por pergunta são registrados e exibidos para o avaliador.</p>
              </div></div>
              <div className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5 text-primary" /><div>
                <p className="font-medium">{questions.length} pergunta(s)</p>
                <p className="text-muted-foreground">Você terá um tempo total para responder. Não é possível pausar.</p>
              </div></div>
            </div>
            {!isPreview && (
              <>
                <div>
                  <Label>Confirme seu CPF</Label>
                  <Input
                    inputMode="numeric"
                    placeholder={lookup.invite?.invitee_cpf_masked}
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Apenas números.</p>
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </>
            )}
            <Button
              className="w-full"
              disabled={(!isPreview && cpf.replace(/\D/g, "").length !== 11) || starting}
              onClick={start}
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : isPreview ? "Iniciar pré-visualização" : "Começar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "submitted") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {isPreview && <PreviewBanner />}
        <Card className="max-w-md w-full">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="font-medium text-lg">{isPreview ? "Submissão simulada" : "Respostas enviadas"}</p>
            <p className="text-sm text-muted-foreground">
              {isPreview ? "Nenhuma resposta foi salva — este foi apenas um preview do ambiente." : "Obrigado por participar."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <RunnerActive
      runId={runId!}
      expiresAt={expiresAt!}
      questions={questions}
      onSubmitted={() => setStage("submitted")}
      assessmentTitle={lookup.assessment?.title ?? ""}
      api={api}
      isPreview={isPreview}
    />
  );
}

function PreviewBanner() {
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-warning/10 text-warning border-b border-warning/30 px-4 py-2 text-xs flex items-center justify-center gap-2">
      <Eye className="h-3.5 w-3.5" />
      <span className="font-medium">Modo pré-visualização</span>
      <span className="text-muted-foreground">— respostas, telemetria e tentativas não são salvas.</span>
    </div>
  );
}

function RunnerActive({
  runId,
  expiresAt,
  questions,
  onSubmitted,
  assessmentTitle,
  api,
  isPreview,
}: {
  runId: string;
  expiresAt: string;
  questions: (RunnerQuestion & { _formTitle: string })[];
  onSubmitted: () => void;
  assessmentTitle: string;
  api: RunnerApi;
  isPreview: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const desired = String(idx + 1);
    if (searchParams.get("q") === desired) return;
    const next = new URLSearchParams(searchParams);
    next.set("q", desired);
    setSearchParams(next, { replace: true });
  }, [idx, searchParams, setSearchParams]);

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasteAttempts, setPasteAttempts] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const [confirmNextOpen, setConfirmNextOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const startTimeRef = useRef<Record<string, number>>({});
  const visHiddenAtRef = useRef<number | null>(null);

  const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const q = questions[idx];
  const qStartedAt = q ? startTimeRef.current[q.id] : undefined;
  const qElapsed = qStartedAt ? Math.floor((now - qStartedAt) / 1000) : 0;
  const qRemaining = q ? Math.max(0, (q.time_limit_seconds ?? 0) - qElapsed) : 0;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "hidden") {
        visHiddenAtRef.current = Date.now();
      } else if (visHiddenAtRef.current) {
        const seconds = Math.round((Date.now() - visHiddenAtRef.current) / 1000);
        visHiddenAtRef.current = null;
        setTabSwitches((c) => c + 1);
        api.telemetry({
          runId,
          tabSwitchInc: 1,
          visibilityLossInc: seconds,
          signals: { last_tab_switch: new Date().toISOString(), seconds },
        });
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [runId, api]);

  useEffect(() => {
    if (!q) return;
    if (!startTimeRef.current[q.id]) startTimeRef.current[q.id] = Date.now();
  }, [q]);

  // O tempo por pergunta é apenas informativo: ao esgotar, NÃO avança nem encerra.
  // Apenas o tempo total da prova encerra a tentativa (efeito acima em `remaining`).

  async function saveAnswer(extra?: { paste?: boolean }) {
    if (!q) return;
    const value = answers[q.id] ?? {};
    const started = startTimeRef.current[q.id] ?? Date.now();
    const elapsed = Math.round((Date.now() - started) / 1000);
    await api.upsertAnswer({
      runId,
      questionId: q.id,
      text: q.question_type === "short_text" || q.question_type === "long_text" ? value.text ?? "" : null,
      options: buildOptionsPayload(q.question_type, value),
      timeSpentSeconds: elapsed,
      pasteDetected: !!extra?.paste,
    });
  }

  async function next() {
    await saveAnswer();
    setIdx((i) => Math.min(i + 1, questions.length - 1));
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    await saveAnswer();
    const res = await api.submitRun(runId);
    if (!res.ok) {
      const code = res.error ?? "";
      const map: Record<string, { title: string; description?: string }> = {
        run_not_found: { title: "Sua sessão da prova expirou", description: "Recarregue a página para iniciar uma nova tentativa. Se você acredita que isso é um engano, fale com quem te enviou o convite." },
        run_submitted: { title: "Esta prova já foi enviada", description: "Não é necessário enviar novamente." },
        run_expired: { title: "O tempo da prova acabou", description: "Suas respostas anteriores foram registradas até o momento do encerramento." },
        run_cancelled: { title: "Esta tentativa foi cancelada", description: "Solicite um novo convite a quem te enviou o link." },
      };
      const m = map[code] ?? { title: "Não foi possível enviar", description: code || "Tente novamente em instantes." };
      toast.error(m.title, { description: m.description });
      setSubmitting(false);
      return;
    }
    onSubmitted();
  }

  if (!q) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full"><CardContent className="py-10 text-center">Sem perguntas.</CardContent></Card>
      </div>
    );
  }

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const lowTime = remaining < 60;
  const qMin = Math.floor(qRemaining / 60);
  const qSec = qRemaining % 60;
  const qExpired = !!q?.time_limit_seconds && q.time_limit_seconds > 0 && qRemaining === 0;
  const qLowTime = q?.time_limit_seconds ? qRemaining > 0 && qRemaining <= Math.max(10, Math.floor(q.time_limit_seconds * 0.1)) : false;
  const hasQTimer = !!q?.time_limit_seconds && q.time_limit_seconds > 0;

  const currentValue = answers[q.id] ?? {};
  const answered = isAnswered(q.question_type, currentValue);

  return (
    <div className={cn("min-h-screen bg-background flex flex-col", isPreview && "pt-9")}>
      {isPreview && <PreviewBanner />}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{assessmentTitle}</p>
          <p className="text-sm font-medium">Pergunta {idx + 1} de {questions.length}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hasQTimer && (
            <Badge
              variant={qExpired ? "destructive" : qLowTime ? "secondary" : "outline"}
              className="font-mono"
              title="Tempo sugerido desta pergunta (informativo — não encerra)"
            >
              <Clock className="h-3 w-3 mr-1" />
              {qExpired ? "Q vencido" : `Q ${String(qMin).padStart(2, "0")}:${String(qSec).padStart(2, "0")}`}
            </Badge>
          )}
          <Badge variant={lowTime ? "destructive" : "secondary"} className="font-mono" title="Tempo total restante da prova">
            <Clock className="h-3 w-3 mr-1" />{String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
          </Badge>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Indicadores de monitoramento">
          <Badge variant={tabSwitches > 0 ? "destructive" : "outline"} className="font-mono">
            Trocas de aba: {tabSwitches}
          </Badge>
          <Badge variant={pasteAttempts > 0 ? "destructive" : "outline"} className="font-mono">
            Tentativas de colar: {pasteAttempts}
          </Badge>
          <Badge variant={copyAttempts > 0 ? "destructive" : "outline"} className="font-mono">
            Tentativas de copiar: {copyAttempts}
          </Badge>
          <span className="text-muted-foreground">Estes eventos são enviados ao avaliador.</span>
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">{q._formTitle} · até {q.time_limit_seconds}s</p>
            <p className="font-medium text-base">{q.prompt}</p>
            {q.help_text && <p className="text-xs text-muted-foreground">{q.help_text}</p>}
            <QuestionRenderer
              type={q.question_type}
              options={q.options}
              value={currentValue}
              onChange={(next) => setAnswers((s) => ({ ...s, [q.id]: next }))}
              onTelemetry={(evt) => {
                if (evt.paste) {
                  setPasteAttempts((c) => c + 1);
                  api.telemetry({ runId, pasteInc: 1 });
                  saveAnswer({ paste: true });
                  toast.error("Colar não é permitido. Esta tentativa foi registrada.");
                }
                if (evt.copy) {
                  setCopyAttempts((c) => c + 1);
                  api.telemetry({ runId, copyInc: 1 });
                }
              }}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          {idx < questions.length - 1 ? (
            <Button
              onClick={() => setConfirmNextOpen(true)}
              disabled={q.required && !answered}
            >
              Próxima
            </Button>
          ) : (
            <Button onClick={() => setConfirmSubmitOpen(true)} disabled={submitting || (q.required && !answered)}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPreview ? "Simular envio" : "Enviar respostas"}
            </Button>
          )}
        </div>

        <ConfirmDialog
          open={confirmNextOpen}
          onOpenChange={setConfirmNextOpen}
          title="Avançar para a próxima pergunta?"
          description="Atenção: após avançar, não será possível voltar e revisar ou alterar esta resposta."
          confirmLabel="Avançar"
          cancelLabel="Continuar respondendo"
          variant="warning"
          onConfirm={async () => {
            setConfirmNextOpen(false);
            await next();
          }}
        />

        <ConfirmDialog
          open={confirmSubmitOpen}
          onOpenChange={setConfirmSubmitOpen}
          title={isPreview ? "Simular envio da prova?" : "Enviar respostas e encerrar a prova?"}
          description="Após o envio, não será possível alterar suas respostas ou retomar a prova. Confira se você concluiu esta última pergunta antes de enviar."
          confirmLabel={isPreview ? "Simular envio" : "Enviar respostas"}
          cancelLabel="Revisar resposta"
          variant="warning"
          onConfirm={async () => {
            setConfirmSubmitOpen(false);
            await submit();
          }}
        />
      </main>
    </div>
  );
}
