import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";

export interface BuLocationOption {
  id: string;
  name: string;
  is_default: boolean;
}

export function useLocations() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["bu-locations-options", buId],
    enabled: !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_locations")
        .select("id, name, is_default")
        .eq("bu_id", buId!)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as BuLocationOption[];
    },
  });

  const defaultLocation = locations.find((l) => l.is_default) || locations[0] || null;

  return {
    locations,
    defaultLocation,
    isLoading,
  };
}
