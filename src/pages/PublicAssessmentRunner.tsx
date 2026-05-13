/**
 * PublicAssessmentRunner — `/q/:token` (PRE-BU, sem login).
 * Identifica respondente por CPF e executa o questionário com timer + anti-fraude.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/globalClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LockedTextarea } from "@/modules/assessments/components/LockedTextarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Question = {
  id: string;
  position: number;
  question_type: "short_text" | "long_text" | "single_choice" | "multiple_choice";
  prompt: string;
  help_text: string | null;
  required: boolean;
  time_limit_seconds: number;
  options: { id: string; label: string }[] | null;
};

type Form = { form_id: string; title: string; description: string | null; level: number; position: number; version_id: string; questions: Question[] };

type Lookup = {
  ok: boolean;
  error?: string;
  invite?: { id: string; status: string; invitee_name: string | null; invitee_cpf_masked: string; expires_at: string | null };
  assessment?: { id: string; title: string; description: string | null; default_total_time_seconds: number | null };
  forms?: Form[];
};

export default function PublicAssessmentRunner() {
  const { token } = useParams<{ token: string }>();
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    supabase.rpc("rpc_assessment_invite_lookup", { p_token: token }).then(({ data, error }) => {
      if (error) {
        setLookup({ ok: false, error: error.message });
      } else {
        setLookup(data as unknown as Lookup);
      }
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return <CenterCard><Loader2 className="h-6 w-6 animate-spin" /></CenterCard>;
  }
  if (!lookup?.ok) {
    return (
      <CenterCard>
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="font-medium">Convite indisponível</p>
        <p className="text-sm text-muted-foreground">{lookup?.error ?? "Verifique o link com quem te convidou."}</p>
      </CenterCard>
    );
  }

  return <RunnerFlow token={token!} lookup={lookup} />;
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">{children}</CardContent>
      </Card>
    </div>
  );
}

function RunnerFlow({ token, lookup }: { token: string; lookup: Lookup }) {
  const [stage, setStage] = useState<"identify" | "running" | "submitted">("identify");
  const [runId, setRunId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState(lookup.invite?.invitee_name ?? "");
  const [starting, setStarting] = useState(false);

  const questions = useMemo(() => {
    return (lookup.forms ?? []).flatMap((f) => f.questions.map((q) => ({ ...q, _formTitle: f.title })));
  }, [lookup.forms]);

  async function start() {
    setStarting(true);
    const { data, error } = await supabase.rpc("rpc_assessment_run_start", {
      p_token: token,
      p_cpf: cpf,
      p_name: name || null,
      p_client_meta: {
        ua: navigator.userAgent.slice(0, 200),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height}`,
      },
    });
    setStarting(false);
    const res = data as { ok: boolean; run_id?: string; expires_at?: string; error?: string } | null;
    if (error || !res?.ok) {
      toast.error(error?.message ?? res?.error ?? "Erro ao iniciar");
      return;
    }
    setRunId(res.run_id!);
    setExpiresAt(res.expires_at!);
    setStage("running");
  }

  if (stage === "identify") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            <Button className="w-full" disabled={cpf.replace(/\D/g, "").length !== 11 || starting} onClick={start}>
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Começar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "submitted") {
    return (
      <CenterCard>
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <p className="font-medium text-lg">Respostas enviadas</p>
        <p className="text-sm text-muted-foreground">Obrigado por participar.</p>
      </CenterCard>
    );
  }

  return (
    <RunnerActive
      runId={runId!}
      expiresAt={expiresAt!}
      questions={questions}
      onSubmitted={() => setStage("submitted")}
      assessmentTitle={lookup.assessment?.title ?? ""}
    />
  );
}

function RunnerActive({
  runId,
  expiresAt,
  questions,
  onSubmitted,
  assessmentTitle,
}: {
  runId: string;
  expiresAt: string;
  questions: (Question & { _formTitle: string })[];
  onSubmitted: () => void;
  assessmentTitle: string;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasteAttempts, setPasteAttempts] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const startTimeRef = useRef<Record<string, number>>({});
  const visHiddenAtRef = useRef<number | null>(null);

  const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const q = questions[idx];

  // Tick timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-submit on expire
  useEffect(() => {
    if (remaining === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // Track visibility (tab switch)
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "hidden") {
        visHiddenAtRef.current = Date.now();
      } else if (visHiddenAtRef.current) {
        const seconds = Math.round((Date.now() - visHiddenAtRef.current) / 1000);
        visHiddenAtRef.current = null;
        setTabSwitches((c) => c + 1);
        supabase.rpc("rpc_assessment_run_telemetry", {
          p_run_id: runId,
          p_tab_switch_inc: 1,
          p_paste_inc: 0,
          p_copy_inc: 0,
          p_visibility_loss_inc: seconds,
          p_signals: { last_tab_switch: new Date().toISOString(), seconds },
        });
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [runId]);

  // Track question start
  useEffect(() => {
    if (!q) return;
    if (!startTimeRef.current[q.id]) startTimeRef.current[q.id] = Date.now();
  }, [q]);

  async function saveAnswer(extra?: { paste?: boolean }) {
    if (!q) return;
    const started = startTimeRef.current[q.id] ?? Date.now();
    const elapsed = Math.round((Date.now() - started) / 1000);
    await supabase.rpc("rpc_assessment_answer_upsert", {
      p_run_id: runId,
      p_question_id: q.id,
      p_answer_text: answers[q.id] ?? "",
      p_answer_options: null,
      p_time_spent_seconds: elapsed,
      p_paste_detected: !!extra?.paste,
      p_signals: {},
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
    const { data, error } = await supabase.rpc("rpc_assessment_run_submit", { p_run_id: runId });
    const res = data as { ok: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast.error(error?.message ?? res?.error ?? "Erro ao enviar");
      setSubmitting(false);
      return;
    }
    onSubmitted();
  }

  if (!q) {
    return <CenterCard><p>Sem perguntas.</p></CenterCard>;
  }

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const lowTime = remaining < 60;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{assessmentTitle}</p>
          <p className="text-sm font-medium">Pergunta {idx + 1} de {questions.length}</p>
        </div>
        <Badge variant={lowTime ? "destructive" : "secondary"} className="font-mono">
          <Clock className="h-3 w-3 mr-1" />{String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
        </Badge>
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
            <LockedTextarea
              rows={6}
              placeholder="Digite sua resposta…"
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((s) => ({ ...s, [q.id]: e.target.value }))}
              onPasteAttempt={() => {
                setPasteAttempts((c) => c + 1);
                supabase.rpc("rpc_assessment_run_telemetry", {
                  p_run_id: runId, p_tab_switch_inc: 0, p_paste_inc: 1, p_copy_inc: 0, p_visibility_loss_inc: 0, p_signals: {},
                });
                saveAnswer({ paste: true });
                toast.error("Colar não é permitido. Esta tentativa foi registrada.");
              }}
              onCopyAttempt={() => {
                setCopyAttempts((c) => c + 1);
                supabase.rpc("rpc_assessment_run_telemetry", {
                  p_run_id: runId, p_tab_switch_inc: 0, p_paste_inc: 0, p_copy_inc: 1, p_visibility_loss_inc: 0, p_signals: {},
                });
              }}
            />
          </CardContent>
        </Card>

        <div className={cn("flex justify-between gap-2", "flex-col-reverse sm:flex-row")}>
          <Button variant="outline" disabled={idx === 0} onClick={async () => { await saveAnswer(); setIdx((i) => Math.max(0, i - 1)); }}>
            Anterior
          </Button>
          {idx < questions.length - 1 ? (
            <Button onClick={next} disabled={q.required && !(answers[q.id] ?? "").trim()}>
              Próxima
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting || (q.required && !(answers[q.id] ?? "").trim())}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar respostas
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
