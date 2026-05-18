/**
 * Assessments — hooks de dados (forms, versões, perguntas, provas, convites, runs).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { toast } from "sonner";

const qk = {
  themes: (bu: string) => ["assessments", "themes", bu] as const,
  forms: (bu: string) => ["assessments", "forms", bu] as const,
  form: (bu: string, id: string) => ["assessments", "form", bu, id] as const,
  versions: (bu: string, formId: string) => ["assessments", "versions", bu, formId] as const,
  questions: (bu: string, versionId: string) => ["assessments", "questions", bu, versionId] as const,
  assessments: (bu: string) => ["assessments", "assessments", bu] as const,
  assessment: (bu: string, id: string) => ["assessments", "assessment", bu, id] as const,
  invites: (bu: string, assessmentId: string) => ["assessments", "invites", bu, assessmentId] as const,
  runs: (bu: string, assessmentId: string) => ["assessments", "runs", bu, assessmentId] as const,
  answers: (bu: string, runId: string) => ["assessments", "answers", bu, runId] as const,
};

export function useForms() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.forms(currentBuId!),
    enabled: !!currentBuId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_forms")
        .select("id, title, description, level, status, theme_id, current_version_id, created_at, updated_at")
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useForm(formId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.form(currentBuId!, formId ?? ""),
    enabled: !!currentBuId && !!formId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_forms")
        .select("id, title, description, level, status, theme_id, current_version_id, created_at, updated_at")
        .eq("id", formId!)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useVersions(formId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.versions(currentBuId!, formId ?? ""),
    enabled: !!currentBuId && !!formId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_form_versions")
        .select("id, version_number, status, frozen, published_at, created_at")
        .eq("form_id", formId!)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useQuestions(versionId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.questions(currentBuId!, versionId ?? ""),
    enabled: !!currentBuId && !!versionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_form_questions")
        .select("id, position, question_type, prompt, help_text, required, time_limit_seconds, options, scoring, points")
        .eq("version_id", versionId!)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssessments() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.assessments(currentBuId!),
    enabled: !!currentBuId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, title, description, status, default_total_time_seconds, available_from, available_until, created_at")
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssessment(id: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.assessment(currentBuId!, id ?? ""),
    enabled: !!currentBuId && !!id,
    queryFn: async () => {
      const { data: assessment, error } = await supabase
        .from("assessments")
        .select("id, title, description, status, default_total_time_seconds, available_from, available_until, category_id, subcategory_id")
        .eq("id", id!)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      const { data: links } = await supabase
        .from("assessment_form_links")
        .select("id, form_id, version_id, position")
        .eq("assessment_id", id!)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("position", { ascending: true });
      return { assessment, links: links ?? [] };
    },
  });
}

export function useInvites(assessmentId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.invites(currentBuId!, assessmentId ?? ""),
    enabled: !!currentBuId && !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_invites")
        .select("id, token, invitee_cpf, invitee_name, invitee_email, status, expires_at, sent_at, started_at, submitted_at, total_time_seconds, created_at")
        .eq("assessment_id", assessmentId!)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRuns(assessmentId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.runs(currentBuId!, assessmentId ?? ""),
    enabled: !!currentBuId && !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_runs")
        .select("id, invite_id, respondent_cpf, respondent_name, status, started_at, submitted_at, tab_switch_count, paste_attempt_count, copy_attempt_count, visibility_loss_seconds")
        .eq("assessment_id", assessmentId!)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAnswers(runId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.answers(currentBuId!, runId ?? ""),
    enabled: !!currentBuId && !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_answers")
        .select("id, question_id, answer_text, answer_options, time_spent_seconds, paste_detected, signals")
        .eq("run_id", runId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ====== Mutations ======

export function useCreateForm() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; level: number; theme_id?: string | null }) => {
      const { data: form, error } = await supabase
        .from("assessment_forms")
        .insert({
          bu_id: currentBuId!,
          title: input.title,
          description: input.description ?? null,
          level: input.level,
          theme_id: input.theme_id ?? null,
          status: "draft",
          created_by: realProfileId,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Cria a versão 1 (draft, não-frozen)
      const { data: version, error: vErr } = await supabase
        .from("assessment_form_versions")
        .insert({
          bu_id: currentBuId!,
          form_id: form.id,
          version_number: 1,
          status: "draft",
          frozen: false,
          created_by: realProfileId,
        })
        .select("id")
        .single();
      if (vErr) throw vErr;
      await supabase.from("assessment_forms").update({ current_version_id: version.id }).eq("id", form.id);
      return { formId: form.id, versionId: version.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments", "forms", currentBuId!] });
      toast.success("Formulário criado");
    },
    onError: (e: Error) => toast.error(`Erro ao criar formulário: ${e.message}`),
  });
}

export function useUpdateForm() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; title?: string; description?: string | null; level?: number; status?: "draft" | "published" | "archived" }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("assessment_forms").update(rest).eq("id", id).eq("bu_id", currentBuId!);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "forms", currentBuId!] });
      qc.invalidateQueries({ queryKey: ["assessments", "form", currentBuId!, v.id] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeleteForm() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Guarda: não permitir excluir se houver vínculos ativos com provas
      const { count, error: cErr } = await supabase
        .from("assessment_form_links")
        .select("id", { count: "exact", head: true })
        .eq("form_id", id)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          `Formulário em uso por ${count} prova(s). Desvincule antes de excluir.`,
        );
      }
      const { error } = await (supabase as any).rpc("soft_delete_assessment_form", {
        p_form_id: id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["assessments", "forms", currentBuId!] });
      qc.invalidateQueries({ queryKey: ["assessments", "form", currentBuId!, id] });
      toast.success("Formulário excluído");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível excluir o formulário"),
  });
}

export function useDuplicateForm() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }): Promise<{ formId: string }> => {
      // 1) Carrega form original
      const { data: original, error: oErr } = await supabase
        .from("assessment_forms")
        .select("title, description, level, theme_id, current_version_id")
        .eq("id", input.id)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .single();
      if (oErr) throw oErr;

      // 2) Cria novo form
      const { data: newForm, error: fErr } = await supabase
        .from("assessment_forms")
        .insert({
          bu_id: currentBuId!,
          title: `Cópia de ${original.title}`,
          description: original.description ?? null,
          level: original.level,
          theme_id: original.theme_id ?? null,
          status: "draft",
          created_by: realProfileId,
        })
        .select("id")
        .single();
      if (fErr) throw fErr;

      // 3) Cria versão 1 draft
      const { data: newVersion, error: vErr } = await supabase
        .from("assessment_form_versions")
        .insert({
          bu_id: currentBuId!,
          form_id: newForm.id,
          version_number: 1,
          status: "draft",
          frozen: false,
          created_by: realProfileId,
        })
        .select("id")
        .single();
      if (vErr) throw vErr;

      // 4) Copia perguntas da versão de origem (current_version_id ou primeira existente)
      let sourceVersionId = original.current_version_id as string | null;
      if (!sourceVersionId) {
        const { data: anyV } = await supabase
          .from("assessment_form_versions")
          .select("id")
          .eq("form_id", input.id)
          .eq("bu_id", currentBuId!)
          .is("deleted_at", null)
          .order("version_number", { ascending: true })
          .limit(1)
          .maybeSingle();
        sourceVersionId = anyV?.id ?? null;
      }

      if (sourceVersionId) {
        const { data: prevQs, error: qErr } = await supabase
          .from("assessment_form_questions")
          .select("position, question_type, prompt, help_text, required, time_limit_seconds, options")
          .eq("version_id", sourceVersionId)
          .eq("bu_id", currentBuId!)
          .is("deleted_at", null)
          .order("position", { ascending: true });
        if (qErr) throw qErr;
        if (prevQs && prevQs.length > 0) {
          const toInsert = prevQs.map((q) => ({
            ...q,
            bu_id: currentBuId!,
            version_id: newVersion.id,
          }));
          const { error: iErr } = await supabase.from("assessment_form_questions").insert(toInsert);
          if (iErr) throw iErr;
        }
      }

      // 5) Define current_version_id
      const { error: uErr } = await supabase
        .from("assessment_forms")
        .update({ current_version_id: newVersion.id })
        .eq("id", newForm.id)
        .eq("bu_id", currentBuId!);
      if (uErr) throw uErr;

      return { formId: newForm.id as string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments", "forms", currentBuId!] });
      toast.success("Formulário duplicado");
    },
    onError: (e: Error) => toast.error(`Erro ao duplicar formulário: ${e.message}`),
  });
}

export function useDuplicateAssessment() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }): Promise<string> => {
      // 1) Carrega prova original
      const { data: original, error: oErr } = await supabase
        .from("assessments")
        .select("title, description, default_total_time_seconds, available_from, available_until")
        .eq("id", input.id)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .single();
      if (oErr) throw oErr;

      // 2) Cria nova prova (draft)
      const { data: newAssessment, error: aErr } = await supabase
        .from("assessments")
        .insert({
          bu_id: currentBuId!,
          title: `Cópia de ${original.title}`,
          description: original.description ?? null,
          default_total_time_seconds: original.default_total_time_seconds ?? null,
          available_from: original.available_from ?? null,
          available_until: original.available_until ?? null,
          status: "draft",
          created_by: realProfileId,
        })
        .select("id")
        .single();
      if (aErr) throw aErr;

      // 3) Copia vínculos com formulários
      const { data: links, error: lErr } = await supabase
        .from("assessment_form_links")
        .select("form_id, version_id, position")
        .eq("assessment_id", input.id)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("position", { ascending: true });
      if (lErr) throw lErr;

      if (links && links.length > 0) {
        const toInsert = links.map((l) => ({
          ...l,
          bu_id: currentBuId!,
          assessment_id: newAssessment.id,
        }));
        const { error: iErr } = await supabase.from("assessment_form_links").insert(toInsert);
        if (iErr) throw iErr;
      }

      return newAssessment.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments", "assessments", currentBuId!] });
      toast.success("Prova duplicada");
    },
    onError: (e: Error) => toast.error(`Erro ao duplicar prova: ${e.message}`),
  });
}

export function useUpsertQuestion() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      version_id: string;
      position: number;
      question_type: "short_text" | "long_text" | "single_choice" | "multiple_choice";
      prompt: string;
      help_text?: string | null;
      required: boolean;
      time_limit_seconds: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options?: any;
    }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("assessment_form_questions").update(rest).eq("id", id).eq("bu_id", currentBuId!);
        if (error) throw error;
      } else {
        const { id: _ignore, ...rest } = input;
        const { error } = await supabase.from("assessment_form_questions").insert([{ ...rest, bu_id: currentBuId! }]);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "questions", currentBuId!, v.version_id] });
      toast.success(v.id ? "Pergunta atualizada" : "Pergunta criada");
    },
    onError: (e: Error) => toast.error(`Erro ao salvar pergunta: ${e.message}`),
  });
}

export function useDeleteQuestion() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; version_id: string }) => {
      const { error } = await supabase.rpc("soft_delete_assessment_form_question", {
        p_question_id: input.id,
        p_version_id: input.version_id,
      });
      if (error) throw error;
    },
    onMutate: async (vars) => {
      const key = qk.questions(currentBuId!, vars.version_id);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Array<{ id: string }>>(key);
      if (previous) {
        qc.setQueryData(
          key,
          previous.filter((q) => q.id !== vars.id),
        );
      }
      return { previous };
    },
    onError: (e: Error, vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.questions(currentBuId!, vars.version_id), ctx.previous);
      }
      toast.error(`Erro ao excluir pergunta: ${e.message}`);
    },
    onSuccess: () => {
      toast.success("Pergunta excluída");
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: qk.questions(currentBuId!, v.version_id) });
    },
  });
}

export function useReorderQuestions() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { version_id: string; ordered_ids: string[] }) => {
      // Persist new positions sequentially-safe via Promise.all (no UNIQUE constraint on position).
      const updates = input.ordered_ids.map((id, idx) =>
        supabase
          .from("assessment_form_questions")
          .update({ position: idx + 1 })
          .eq("id", id)
          .eq("bu_id", currentBuId!)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onMutate: async (vars) => {
      const key = qk.questions(currentBuId!, vars.version_id);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Array<{ id: string; position: number }>>(key);
      if (previous) {
        const byId = new Map(previous.map((q) => [q.id, q]));
        const next = vars.ordered_ids
          .map((id, idx) => {
            const q = byId.get(id);
            return q ? { ...q, position: idx + 1 } : null;
          })
          .filter(Boolean);
        qc.setQueryData(key, next);
      }
      return { previous };
    },
    onError: (e: Error, vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.questions(currentBuId!, vars.version_id), ctx.previous);
      }
      toast.error(`Erro ao reordenar: ${e.message}`);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: qk.questions(currentBuId!, vars.version_id) });
    },
  });
}

export function usePublishVersion() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { form_id: string; version_id: string }) => {
      const { error } = await supabase
        .from("assessment_form_versions")
        .update({ status: "published", frozen: true, published_at: new Date().toISOString() })
        .eq("id", input.version_id)
        .eq("bu_id", currentBuId!);
      if (error) throw error;
      await supabase.from("assessment_forms").update({ status: "published" }).eq("id", input.form_id).eq("bu_id", currentBuId!);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "forms", currentBuId!] });
      qc.invalidateQueries({ queryKey: ["assessments", "versions", currentBuId!, v.form_id] });
      toast.success("Versão publicada");
    },
    onError: (e: Error) => toast.error(`Erro ao publicar: ${e.message}`),
  });
}

export function useCreateDraftVersion() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { form_id: string }) => {
      // Garante que não existe rascunho ainda
      const { data: existingDraft } = await supabase
        .from("assessment_form_versions")
        .select("id")
        .eq("form_id", input.form_id)
        .eq("bu_id", currentBuId!)
        .eq("frozen", false)
        .is("deleted_at", null)
        .maybeSingle();
      if (existingDraft) return { versionId: existingDraft.id as string };

      // Pega última versão (maior version_number) para herdar perguntas
      const { data: latest, error: lErr } = await supabase
        .from("assessment_form_versions")
        .select("id, version_number")
        .eq("form_id", input.form_id)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lErr) throw lErr;

      const nextNumber = (latest?.version_number ?? 0) + 1;

      const { data: newVersion, error: vErr } = await supabase
        .from("assessment_form_versions")
        .insert({
          bu_id: currentBuId!,
          form_id: input.form_id,
          version_number: nextNumber,
          status: "draft",
          frozen: false,
          created_by: realProfileId,
        })
        .select("id")
        .single();
      if (vErr) throw vErr;

      // Duplica perguntas da versão anterior
      if (latest?.id) {
        const { data: prevQs, error: qErr } = await supabase
          .from("assessment_form_questions")
          .select("position, question_type, prompt, help_text, required, time_limit_seconds, options")
          .eq("version_id", latest.id)
          .eq("bu_id", currentBuId!)
          .is("deleted_at", null)
          .order("position", { ascending: true });
        if (qErr) throw qErr;
        if (prevQs && prevQs.length > 0) {
          const toInsert = prevQs.map((q) => ({
            ...q,
            bu_id: currentBuId!,
            version_id: newVersion.id,
          }));
          const { error: iErr } = await supabase.from("assessment_form_questions").insert(toInsert);
          if (iErr) throw iErr;
        }
      }

      await supabase
        .from("assessment_forms")
        .update({ current_version_id: newVersion.id, status: "draft" })
        .eq("id", input.form_id)
        .eq("bu_id", currentBuId!);

      return { versionId: newVersion.id as string };
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "versions", currentBuId!, v.form_id] });
      qc.invalidateQueries({ queryKey: ["assessments", "forms", currentBuId!] });
      toast.success("Nova versão (rascunho) criada");
    },
    onError: (e: Error) => toast.error(`Erro ao criar rascunho: ${e.message}`),
  });
}

export function useCreateAssessment() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      category_id?: string | null;
      subcategory_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          bu_id: currentBuId!,
          title: input.title,
          description: input.description ?? null,
          category_id: input.category_id ?? null,
          subcategory_id: input.subcategory_id ?? null,
          status: "draft",
          created_by: realProfileId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments", "assessments", currentBuId!] });
      toast.success("Prova criada");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useUpdateAssessment() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      description?: string | null;
      status?: "draft" | "active" | "archived";
      default_total_time_seconds?: number | null;
      available_from?: string | null;
      available_until?: string | null;
      category_id?: string | null;
      subcategory_id?: string | null;
    }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("assessments").update(rest).eq("id", id).eq("bu_id", currentBuId!);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "assessments", currentBuId!] });
      qc.invalidateQueries({ queryKey: ["assessments", "assessment", currentBuId!, v.id] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeleteAssessment() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_assessment", {
        p_assessment_id: id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["assessments", "assessments", currentBuId!] });
      qc.invalidateQueries({ queryKey: ["assessments", "assessment", currentBuId!, id] });
      toast.success("Prova excluída");
    },
    onError: (e: Error) => {
      toast.error(`Erro ao excluir: ${e.message}`, { duration: 8000 });
    },
  });
}

export function useAddFormToAssessment() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { assessment_id: string; form_id: string; version_id: string; position: number }) => {
      const { error } = await supabase.from("assessment_form_links").insert({ ...input, bu_id: currentBuId! });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "assessment", currentBuId!, v.assessment_id] });
      toast.success("Formulário adicionado");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useRemoveFormFromAssessment() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { link_id: string; assessment_id: string }) => {
      const { error } = await supabase
        .from("assessment_form_links")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", input.link_id)
        .eq("bu_id", currentBuId!);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "assessment", currentBuId!, v.assessment_id] });
    },
  });
}

function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 32);
}

export function useCreateInvite() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assessment_id: string;
      invitee_cpf: string;
      invitee_name?: string;
      invitee_email?: string;
      expires_at?: string | null;
    }) => {
      const cpfClean = input.invitee_cpf.replace(/\D/g, "");
      const { data, error } = await supabase
        .from("assessment_invites")
        .insert({
          bu_id: currentBuId!,
          assessment_id: input.assessment_id,
          token: generateToken(),
          invitee_cpf: cpfClean,
          invitee_name: input.invitee_name ?? null,
          invitee_email: input.invitee_email ?? null,
          expires_at: input.expires_at ?? null,
          created_by: realProfileId,
        })
        .select("id, token")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "invites", currentBuId!, v.assessment_id] });
      toast.success("Convite criado");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export interface BatchInviteInput {
  invitee_profile_id?: string | null;
  invitee_cpf: string;
  invitee_name?: string | null;
  invitee_email?: string | null;
}

export interface BatchInviteResult {
  created: number;
  skipped_duplicates: string[]; // CPFs
  failed: Array<{ cpf: string; reason: string }>;
}

export function useCreateInvitesBatch() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assessment_id: string;
      invites: BatchInviteInput[];
      expires_at?: string | null;
    }): Promise<BatchInviteResult> => {
      // Normaliza CPF + remove duplicados internos preservando o primeiro
      const seen = new Set<string>();
      const rows = input.invites
        .map((i) => ({
          ...i,
          invitee_cpf: i.invitee_cpf.replace(/\D/g, ""),
        }))
        .filter((i) => i.invitee_cpf.length === 11)
        .filter((i) => {
          if (seen.has(i.invitee_cpf)) return false;
          seen.add(i.invitee_cpf);
          return true;
        });

      if (rows.length === 0) {
        return { created: 0, skipped_duplicates: [], failed: [] };
      }

      const payload = rows.map((r) => ({
        bu_id: currentBuId!,
        assessment_id: input.assessment_id,
        token: generateToken(),
        invitee_cpf: r.invitee_cpf,
        invitee_name: r.invitee_name ?? null,
        invitee_email: r.invitee_email ?? null,
        invitee_profile_id: r.invitee_profile_id ?? null,
        expires_at: input.expires_at ?? null,
        created_by: realProfileId,
      }));

      // Tenta lote; em 23505, identifica CPFs duplicados existentes e re-tenta sem eles.
      let toInsert = payload;
      const skipped: string[] = [];
      const failed: BatchInviteResult["failed"] = [];

      for (let attempt = 0; attempt < 2 && toInsert.length > 0; attempt++) {
        const { error } = await supabase.from("assessment_invites").insert(toInsert);
        if (!error) {
          break;
        }
        if (error.code === "23505" && attempt === 0) {
          // Identifica CPFs já existentes para esta prova (qualquer status não revogado).
          const cpfs = toInsert.map((r) => r.invitee_cpf);
          const { data: existing } = await supabase
            .from("assessment_invites")
            .select("invitee_cpf")
            .eq("assessment_id", input.assessment_id)
            .in("invitee_cpf", cpfs)
            .is("deleted_at", null);
          const existingSet = new Set((existing ?? []).map((r) => r.invitee_cpf));
          for (const cpf of cpfs) if (existingSet.has(cpf)) skipped.push(cpf);
          toInsert = toInsert.filter((r) => !existingSet.has(r.invitee_cpf));
          continue;
        }
        // outro erro → marca todos como falha
        for (const r of toInsert) failed.push({ cpf: r.invitee_cpf, reason: error.message });
        toInsert = [];
      }

      return {
        created: payload.length - skipped.length - failed.length,
        skipped_duplicates: skipped,
        failed,
      };
    },
    onSuccess: (res, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "invites", currentBuId!, v.assessment_id] });
      const parts: string[] = [];
      if (res.created > 0) parts.push(`${res.created} convite(s) criado(s)`);
      if (res.skipped_duplicates.length) parts.push(`${res.skipped_duplicates.length} duplicado(s)`);
      if (res.failed.length) parts.push(`${res.failed.length} falha(s)`);
      if (res.created > 0 && res.skipped_duplicates.length === 0 && res.failed.length === 0) {
        toast.success(parts.join(" · "));
      } else {
        toast(parts.join(" · ") || "Nada a fazer");
      }
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useRevokeInvite() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; assessment_id: string }) => {
      const { error } = await supabase
        .from("assessment_invites")
        .update({ status: "revoked" })
        .eq("id", input.id)
        .eq("bu_id", currentBuId!);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "invites", currentBuId!, v.assessment_id] });
      toast.success("Convite revogado");
    },
  });
}

export function useReactivateInvite() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; assessment_id: string }) => {
      const { error } = await supabase
        .from("assessment_invites")
        .update({ status: "pending" })
        .eq("id", input.id)
        .eq("bu_id", currentBuId!)
        .eq("status", "revoked");
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "invites", currentBuId!, v.assessment_id] });
      toast.success("Convite reativado");
    },
    onError: () => toast.error("Erro ao reativar convite"),
  });
}
