/**
 * Runner API — abstração das operações de uma "execução de prova".
 *
 * - `realRunnerApi`: usa as RPCs reais (`rpc_assessment_run_*`) — caminho público `/q/:token`.
 * - `previewRunnerApi`: no-op em memória — caminho admin `/assessments/provas/:id/preview`.
 *
 * O componente `AssessmentRunnerView` consome essa interface para que a mesma UI
 * funcione tanto para o respondente real quanto para o pré-visualizador.
 */
import { supabase as globalSupabase } from "@/integrations/supabase/globalClient";

export type StartRunInput = {
  cpf: string;
  name: string | null;
  clientMeta: Record<string, unknown>;
};

export type StartRunResult =
  | { ok: true; runId: string; expiresAt: string; error?: undefined }
  | { ok: false; runId?: undefined; expiresAt?: undefined; error: string };

export type AnswerInput = {
  runId: string;
  questionId: string;
  /** texto livre (short_text / long_text) */
  text?: string | null;
  /** estrutura por tipo: choice → string[] de option ids; scale → {value:number} */
  options?: unknown;
  timeSpentSeconds: number;
  pasteDetected: boolean;
};

export type TelemetryInput = {
  runId: string;
  tabSwitchInc?: number;
  pasteInc?: number;
  copyInc?: number;
  visibilityLossInc?: number;
  signals?: Record<string, unknown>;
};

export interface RunnerApi {
  readonly mode: "real" | "preview";
  startRun(input: StartRunInput): Promise<StartRunResult>;
  upsertAnswer(input: AnswerInput): Promise<void>;
  submitRun(runId: string): Promise<{ ok: boolean; error?: string }>;
  telemetry(input: TelemetryInput): Promise<void>;
}

// ───────────────────────── Real ─────────────────────────

export function createRealRunnerApi(token: string): RunnerApi {
  return {
    mode: "real",
    async startRun({ cpf, name, clientMeta }) {
      const { data, error } = await globalSupabase.rpc("rpc_assessment_run_start", {
        p_token: token,
        p_cpf: cpf,
        p_name: name,
        p_client_meta: clientMeta as never,
      });
      const res = data as { ok: boolean; run_id?: string; expires_at?: string; error?: string } | null;
      if (error || !res?.ok) {
        return { ok: false, error: error?.message ?? res?.error ?? "Erro ao iniciar" };
      }
      return { ok: true, runId: res.run_id!, expiresAt: res.expires_at! };
    },
    async upsertAnswer({ runId, questionId, text, timeSpentSeconds, pasteDetected }) {
      await globalSupabase.rpc("rpc_assessment_answer_upsert", {
        p_run_id: runId,
        p_question_id: questionId,
        p_answer_text: text,
        p_answer_options: null,
        p_time_spent_seconds: timeSpentSeconds,
        p_paste_detected: pasteDetected,
        p_signals: {} as never,
      });
    },
    async submitRun(runId) {
      const { data, error } = await globalSupabase.rpc("rpc_assessment_run_submit", { p_run_id: runId });
      const res = data as { ok: boolean; error?: string } | null;
      if (error || !res?.ok) return { ok: false, error: error?.message ?? res?.error ?? "Erro ao enviar" };
      return { ok: true };
    },
    async telemetry({ runId, tabSwitchInc = 0, pasteInc = 0, copyInc = 0, visibilityLossInc = 0, signals = {} }) {
      await globalSupabase.rpc("rpc_assessment_run_telemetry", {
        p_run_id: runId,
        p_tab_switch_inc: tabSwitchInc,
        p_paste_inc: pasteInc,
        p_copy_inc: copyInc,
        p_visibility_loss_inc: visibilityLossInc,
        p_signals: signals as never,
      });
    },
  };
}

// ───────────────────────── Preview ─────────────────────────

export function createPreviewRunnerApi(opts?: { totalSeconds?: number }): RunnerApi {
  const totalSeconds = opts?.totalSeconds ?? 60 * 60; // 1h default
  return {
    mode: "preview",
    async startRun() {
      return {
        ok: true,
        runId: "preview",
        expiresAt: new Date(Date.now() + totalSeconds * 1000).toISOString(),
      };
    },
    async upsertAnswer() {
      // no-op: respostas em modo preview não são persistidas.
    },
    async submitRun() {
      return { ok: true };
    },
    async telemetry() {
      // no-op: telemetria não é registrada em modo preview.
    },
  };
}
