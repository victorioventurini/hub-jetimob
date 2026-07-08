/**
 * Hooks for the CEO Copilot (analysis chat).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { supabase as globalSupabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { toast } from "sonner";

const KEY_THREADS = (buId: string) => ["analysis-chat", "threads", buId] as const;
const KEY_MESSAGES = (threadId: string) =>
  ["analysis-chat", "messages", threadId] as const;

export interface AnalysisThread {
  id: string;
  title: string;
  model: string;
  last_message_at: string;
  message_count: number;
  created_at: string;
}

export interface AnalysisMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_trace?: Array<{ name: string; args: unknown; ok: boolean; ms: number }>;
  created_at: string;
}

/** Lista threads do usuário na BU ativa. */
export function useAnalysisThreads() {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useQuery({
    queryKey: buId ? KEY_THREADS(buId) : ["analysis-chat", "threads", "none"],
    enabled: !!buId,
    queryFn: async (): Promise<AnalysisThread[]> => {
      const { data, error } = await supabase
        .from("analysis_threads")
        .select("id, title, model, last_message_at, message_count, created_at")
        .eq("bu_id", buId!)
        .is("archived_at", null)
        .order("last_message_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AnalysisThread[];
    },
  });
}

/** Carrega mensagens de uma thread. */
export function useAnalysisMessages(threadId: string | undefined) {
  const supabase = useBuScopedSupabase();
  return useQuery({
    queryKey: threadId ? KEY_MESSAGES(threadId) : ["analysis-chat", "messages", "none"],
    enabled: !!threadId,
    queryFn: async (): Promise<AnalysisMessage[]> => {
      const { data, error } = await supabase
        .from("analysis_messages")
        .select("id, role, parts, created_at")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m) => {
        const parts = (m.parts ?? {}) as Record<string, unknown>;
        return {
          id: m.id as string,
          role: m.role as "user" | "assistant" | "system",
          content: String(parts.content ?? ""),
          tool_trace: parts.tool_trace as AnalysisMessage["tool_trace"],
          created_at: m.created_at as string,
        };
      });
    },
  });
}

/** Cria uma nova thread vazia. */
export function useCreateAnalysisThread() {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (title?: string | undefined): Promise<string> => {
      if (!currentBu?.id) throw new Error("BU_REQUIRED");
      if (!realProfileId) throw new Error("PROFILE_REQUIRED");
      const { data, error } = await supabase
        .from("analysis_threads")
        .insert({
          bu_id: currentBu.id,
          owner_profile_id: realProfileId,
          title: title?.trim() || "Nova conversa",
          model: "google/gemini-2.5-flash",
        })
        .select("id")
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: KEY_THREADS(currentBu.id) });
      return data.id as string;
    },
  });
}

/** Apaga thread (cascata apaga mensagens). */
export function useDeleteAnalysisThread() {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("analysis_threads")
        .delete()
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (currentBu?.id) qc.invalidateQueries({ queryKey: KEY_THREADS(currentBu.id) });
    },
  });
}

/**
 * Envia mensagem do usuário, invoca edge function analysis-chat,
 * persiste user + assistant messages.
 */
export function useSendAnalysisMessage() {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      threadId: string;
      history: AnalysisMessage[];
      userText: string;
    }) => {
      if (!currentBu?.id) throw new Error("BU_REQUIRED");
      const buId = currentBu.id;

      // 1. Save user message
      const { error: userErr } = await supabase.from("analysis_messages").insert({
        thread_id: input.threadId,
        bu_id: buId,
        role: "user",
        parts: { content: input.userText },
      });
      if (userErr) throw userErr;

      // 2. Build llm history (last 20 turns to control cost)
      const trimmed = input.history.slice(-20);
      const messages = [
        ...trimmed.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: input.userText },
      ];

      // 3. Invoke edge function (use global supabase to keep auth header)
      const { data, error } = await globalSupabase.functions.invoke("analysis-chat", {
        body: { bu_id: buId, thread_id: input.threadId, messages },
      });
      if (error) {
        const msg = String(error.message || "");
        if (msg.includes("429")) throw new Error("RATE_LIMIT");
        if (msg.includes("402")) throw new Error("NO_CREDITS");
        throw new Error(msg || "Erro ao consultar o copiloto");
      }

      const payload = (data?.data ?? data ?? {}) as {
        content?: string;
        tool_trace?: AnalysisMessage["tool_trace"];
        model_used?: string;
        tokens_total?: number | null;
      };
      const assistantContent = String(payload.content ?? "").trim();
      if (!assistantContent) {
        throw new Error("EMPTY_AI_RESPONSE");
      }
      const toolTrace = payload.tool_trace ?? [];

      // 4. Save assistant message
      const { error: aErr } = await supabase.from("analysis_messages").insert({
        thread_id: input.threadId,
        bu_id: buId,
        role: "assistant",
        parts: { content: assistantContent, tool_trace: toolTrace } as never,
        model: payload.model_used,
        tokens_output: payload.tokens_total ?? null,
      });
      if (aErr) throw aErr;

      // 5. Update thread metadata
      await supabase
        .from("analysis_threads")
        .update({
          last_message_at: new Date().toISOString(),
          message_count: input.history.length + 2,
          // Promote first user message to title if still "Nova conversa"
          ...(input.history.length === 0
            ? { title: input.userText.slice(0, 80) }
            : {}),
        })
        .eq("id", input.threadId);

      return { content: assistantContent, tool_trace: toolTrace };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEY_MESSAGES(vars.threadId) });
      if (currentBu?.id) qc.invalidateQueries({ queryKey: KEY_THREADS(currentBu.id) });
    },
    onError: (err: Error) => {
      const map: Record<string, string> = {
        RATE_LIMIT: "Muitas requisições. Tente novamente em alguns segundos.",
        NO_CREDITS: "Sem créditos de IA. Adicione créditos no workspace.",
        BU_REQUIRED: "Selecione uma BU antes de conversar.",
        EMPTY_AI_RESPONSE: "A IA retornou uma resposta vazia. Tente enviar novamente.",
      };
      toast.error(map[err.message] ?? err.message ?? "Erro no copiloto");
    },
  });
}
