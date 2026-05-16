/**
 * Assessments — hooks de categorias e subcategorias.
 * Padrão alinhado a useAssessmentsData.ts:
 *  - useBuScopedSupabase para isolar por BU
 *  - currentBuId obrigatório nas queries
 *  - realProfileId em mutations (impersonation-safe)
 *  - select explícito (sem "*")
 *  - soft delete via update deleted_at
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { toast } from "sonner";

export type CatalogStatus = "active" | "inactive";

export interface AssessmentCategory {
  id: string;
  bu_id: string;
  name: string;
  description: string | null;
  status: CatalogStatus;
  created_at: string;
  updated_at: string;
}

export interface AssessmentSubcategory {
  id: string;
  bu_id: string;
  category_id: string;
  name: string;
  status: CatalogStatus;
  created_at: string;
  updated_at: string;
}

const qk = {
  categories: (bu: string) => ["assessments", "categories", bu] as const,
  subcategories: (bu: string, categoryId: string) =>
    ["assessments", "subcategories", bu, categoryId] as const,
  allSubcategories: (bu: string) => ["assessments", "subcategories", bu] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

export function useAssessmentCategories() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.categories(currentBuId ?? ""),
    enabled: !!currentBuId,
    queryFn: async (): Promise<AssessmentCategory[]> => {
      const { data, error } = await supabase
        .from("assessment_categories")
        .select("id, bu_id, name, description, status, created_at, updated_at")
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AssessmentCategory[];
    },
  });
}

export function useAssessmentSubcategories(categoryId: string | null | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.subcategories(currentBuId ?? "", categoryId ?? ""),
    enabled: !!currentBuId && !!categoryId,
    queryFn: async (): Promise<AssessmentSubcategory[]> => {
      const { data, error } = await supabase
        .from("assessment_subcategories")
        .select("id, bu_id, category_id, name, status, created_at, updated_at")
        .eq("bu_id", currentBuId!)
        .eq("category_id", categoryId!)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AssessmentSubcategory[];
    },
  });
}

/** Carrega TODAS as subcategorias da BU (para mapas/contagens na listagem de categorias). */
export function useAllAssessmentSubcategories() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  return useQuery({
    queryKey: qk.allSubcategories(currentBuId ?? ""),
    enabled: !!currentBuId,
    queryFn: async (): Promise<AssessmentSubcategory[]> => {
      const { data, error } = await supabase
        .from("assessment_subcategories")
        .select("id, bu_id, category_id, name, status, created_at, updated_at")
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AssessmentSubcategory[];
    },
  });
}

// ============================================================================
// MUTATIONS — Categories
// ============================================================================

export function useCreateAssessmentCategory() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string | null; status?: CatalogStatus }) => {
      const { data, error } = await supabase
        .from("assessment_categories")
        .insert({
          bu_id: currentBuId!,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          status: input.status ?? "active",
          created_by: realProfileId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments", "categories", currentBuId!] });
      toast.success("Categoria criada");
    },
    onError: (e: Error) => toast.error(`Erro ao criar categoria: ${e.message}`),
  });
}

export function useUpdateAssessmentCategory() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string | null; status?: CatalogStatus }) => {
      const { id, ...rest } = input;
      const patch: Record<string, unknown> = {};
      if (rest.name !== undefined) patch.name = rest.name.trim();
      if (rest.description !== undefined) patch.description = rest.description?.trim() || null;
      if (rest.status !== undefined) patch.status = rest.status;
      const { error } = await supabase
        .from("assessment_categories")
        .update(patch)
        .eq("id", id)
        .eq("bu_id", currentBuId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments", "categories", currentBuId!] });
      toast.success("Categoria atualizada");
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar categoria: ${e.message}`),
  });
}

export function useDeleteAssessmentCategory() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Guarda: bloquear exclusão se houver provas usando esta categoria
      const { count, error: cErr } = await supabase
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(`Categoria em uso por ${count} prova(s). Remova o vínculo antes de excluir.`);
      }
      const { error } = await supabase
        .from("assessment_categories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("bu_id", currentBuId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments", "categories", currentBuId!] });
      qc.invalidateQueries({ queryKey: ["assessments", "subcategories", currentBuId!] });
      toast.success("Categoria excluída");
    },
    onError: (e: Error) => toast.error(`Erro ao excluir categoria: ${e.message}`),
  });
}

// ============================================================================
// MUTATIONS — Subcategories
// ============================================================================

export function useCreateAssessmentSubcategory() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { category_id: string; name: string; status?: CatalogStatus }) => {
      const { data, error } = await supabase
        .from("assessment_subcategories")
        .insert({
          bu_id: currentBuId!,
          category_id: input.category_id,
          name: input.name.trim(),
          status: input.status ?? "active",
          created_by: realProfileId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["assessments", "subcategories", currentBuId!, v.category_id] });
      qc.invalidateQueries({ queryKey: ["assessments", "subcategories", currentBuId!] });
      toast.success("Subcategoria criada");
    },
    onError: (e: Error) => toast.error(`Erro ao criar subcategoria: ${e.message}`),
  });
}

export function useUpdateAssessmentSubcategory() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; status?: CatalogStatus }) => {
      const { id, ...rest } = input;
      const patch: Record<string, unknown> = {};
      if (rest.name !== undefined) patch.name = rest.name.trim();
      if (rest.status !== undefined) patch.status = rest.status;
      const { error } = await supabase
        .from("assessment_subcategories")
        .update(patch)
        .eq("id", id)
        .eq("bu_id", currentBuId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments", "subcategories", currentBuId!] });
      toast.success("Subcategoria atualizada");
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar subcategoria: ${e.message}`),
  });
}

export function useDeleteAssessmentSubcategory() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: cErr } = await supabase
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .eq("subcategory_id", id)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(`Subcategoria em uso por ${count} prova(s). Remova o vínculo antes de excluir.`);
      }
      const { error } = await supabase
        .from("assessment_subcategories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("bu_id", currentBuId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments", "subcategories", currentBuId!] });
      toast.success("Subcategoria excluída");
    },
    onError: (e: Error) => toast.error(`Erro ao excluir subcategoria: ${e.message}`),
  });
}
