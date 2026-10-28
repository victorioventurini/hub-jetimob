// Gestor externo: usuário externo com "Vê tickets da empresa" gerencia
// as categorias que cada contato da própria empresa atende na BU ativa.
import { useQuery } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { queryKeys } from "@/lib/queryKeys";

export interface ManagedCategoryOption {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

export function useManagedPartnerCompany() {
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const supabase = useBuScopedSupabase();
  return useQuery({
    queryKey: queryKeys.tickets.managedPartnerCompany(buId),
    enabled: !!buId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_managed_partner_company", { p_bu_id: buId! });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}

export function useManagedCompanyCategories(enabled: boolean) {
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const supabase = useBuScopedSupabase();
  return useQuery({
    queryKey: queryKeys.tickets.managedCompanyCategories(buId),
    enabled: !!buId && enabled,
    queryFn: async (): Promise<ManagedCategoryOption[]> => {
      const { data, error } = await supabase.rpc("list_managed_company_categories", { p_bu_id: buId! });
      if (error) throw error;
      const map = new Map<string, ManagedCategoryOption>();
      for (const row of data ?? []) {
        const entry = map.get(row.category_id) ?? { id: row.category_id, name: row.category_name, subcategories: [] };
        if (row.subcategory_id && !entry.subcategories.some((s) => s.id === row.subcategory_id)) {
          entry.subcategories.push({ id: row.subcategory_id, name: row.subcategory_name });
        }
        map.set(row.category_id, entry);
      }
      return Array.from(map.values());
    },
  });
}
