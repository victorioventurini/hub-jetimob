/**
 * useSuppliers - Lista fornecedores associados à BU atual
 * Busca empresas com role='supplier' em external_company_bu_associations
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { suppliersKeys } from "@/lib/queryKeys/suppliers";
import type { SupplierBuAssociation } from "../types";

export interface UseSuppliersOptions {
  search?: string;
}

export function useSuppliers(options: UseSuppliersOptions = {}) {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();
  const { search } = options;

  return useQuery({
    queryKey: suppliersKeys.list(currentBuId, { search }),
    enabled: !!currentBuId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    queryFn: async () => {
      let query = supabase
        .from("external_company_bu_associations")
        .select(`
          id, is_active, notes,
          external_company:external_companies!external_company_id(
            id, name, legal_name, document, document_type, person_type, status
          )
        `)
        .eq("bu_id", currentBuId!)
        .eq("role", "supplier")
        .is("deleted_at", null)
        .eq("is_active", true);

      if (search && search.trim()) {
        // Filter will be applied client-side since we can't filter on joined table directly
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search on external_company.name if needed
      let results = (data || []) as SupplierBuAssociation[];
      if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        results = results.filter(
          (item) => item.external_company?.name?.toLowerCase().includes(term)
        );
      }

      return results;
    },
  });
}
