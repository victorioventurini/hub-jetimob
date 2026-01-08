import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to fetch distinct brand names from inventory for autocomplete
 */
export function useBrands() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  const { data: brands = [], isLoading } = useQuery({
    queryKey: [...queryKeys.assets.inventory.all(buId ?? null), "brands"],
    enabled: !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_inventory")
        .select("brand")
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .not("brand", "is", null)
        .order("brand");

      if (error) throw error;

      // Get unique brands
      const uniqueBrands = [...new Set(
        (data || [])
          .map(item => item.brand?.trim())
          .filter((brand): brand is string => !!brand)
      )].sort((a, b) => a.localeCompare(b));

      return uniqueBrands;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return { brands, isLoading };
}
