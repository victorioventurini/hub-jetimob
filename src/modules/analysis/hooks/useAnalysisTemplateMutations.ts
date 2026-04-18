/**
 * useAnalysisTemplateMutations — CRUD de templates da BU
 * Apenas templates com scope='bu' podem ser criados/editados/excluídos pelo frontend.
 * Templates globais (scope='global') exigem super_admin e UI dedicada.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { toast } from "sonner";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { AnalysisDepth, AnalysisMode, AnalysisModule } from "../types";

export interface TemplateFormData {
  name: string;
  category: string;
  premise: string;
  display_order: number;
  defaults: {
    modules?: AnalysisModule[];
    depth?: AnalysisDepth;
    mode?: AnalysisMode;
  };
}

export function useCreateTemplate() {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: TemplateFormData) => {
      if (!currentBu?.id) throw new Error("BU não selecionada");
      if (!realProfileId) throw new Error("Identidade não resolvida");
      const { error } = await supabase.from("analysis_templates").insert({
        bu_id: currentBu.id,
        scope: "bu",
        created_by: realProfileId,
        name: input.name,
        category: input.category,
        premise: input.premise,
        display_order: input.display_order,
        defaults: input.defaults as never,
        is_admin_only: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template criado");
      qc.invalidateQueries({ queryKey: analysisKeys.templatesPrefix() });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTemplate() {
  const supabase = useBuScopedSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; input: TemplateFormData }) => {
      const { error } = await supabase
        .from("analysis_templates")
        .update({
          name: params.input.name,
          category: params.input.category,
          premise: params.input.premise,
          display_order: params.input.display_order,
          defaults: params.input.defaults as never,
        })
        .eq("id", params.id)
        .eq("scope", "bu");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template atualizado");
      qc.invalidateQueries({ queryKey: analysisKeys.templatesPrefix() });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTemplate() {
  const supabase = useBuScopedSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("analysis_templates")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("scope", "bu");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template excluído");
      qc.invalidateQueries({ queryKey: analysisKeys.templatesPrefix() });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
