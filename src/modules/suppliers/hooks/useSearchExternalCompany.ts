/**
 * useSearchExternalCompany - Busca global em external_companies
 * Permite buscar por nome ou CNPJ/CPF
 * Usa client global (tabela não é BU-scoped)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { suppliersKeys } from "@/lib/queryKeys/suppliers";
import type { SearchedCompany } from "../types";

export function useSearchExternalCompany(searchTerm: string | null) {
  // Normaliza para verificar se é documento
  const normalized = searchTerm?.replace(/\D/g, "") ?? "";
  const isDocument = normalized.length >= 11;

  return useQuery({
    queryKey: suppliersKeys.search(searchTerm),
    enabled: (searchTerm?.length ?? 0) >= 3,
    staleTime: 30 * 1000, // 30 segundos
    queryFn: async () => {
      let query = supabase
        .from("external_companies")
        .select("id, name, document, document_type, person_type, status")
        .is("deleted_at", null)
        .eq("status", "active")
        .limit(15);

      if (isDocument) {
        // Busca por documento (CNPJ ou CPF)
        query = query.eq("document", normalized);
      } else if (searchTerm && searchTerm.length >= 3) {
        // Busca por nome
        query = query.ilike("name", `%${searchTerm}%`);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SearchedCompany[];
    },
  });
}
