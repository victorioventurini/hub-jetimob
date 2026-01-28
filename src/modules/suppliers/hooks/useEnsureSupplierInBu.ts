/**
 * useEnsureSupplierInBu - Garante que uma empresa está associada à BU como supplier
 * Se não existir associação, cria automaticamente
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { suppliersKeys } from "@/lib/queryKeys/suppliers";
import { toast } from "sonner";

export function useEnsureSupplierInBu() {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (externalCompanyId: string) => {
      if (!currentBuId) throw new Error("BU não selecionada");

      // Verificar se já existe associação como supplier
      const { data: existing, error: checkError } = await supabase
        .from("external_company_bu_associations")
        .select("id")
        .eq("external_company_id", externalCompanyId)
        .eq("bu_id", currentBuId)
        .eq("role", "supplier")
        .is("deleted_at", null)
        .maybeSingle();

      if (checkError) throw checkError;

      // Se já existe, retorna o id existente
      if (existing) return existing.id;

      // Criar nova associação
      const { data, error } = await supabase
        .from("external_company_bu_associations")
        .insert({
          external_company_id: externalCompanyId,
          bu_id: currentBuId,
          role: "supplier",
          is_active: true,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: suppliersKeys.all(currentBuId ?? null) 
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao associar fornecedor:", error);
      toast.error("Erro ao associar fornecedor à unidade");
    },
  });
}
