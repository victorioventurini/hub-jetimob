// ============================================================
// USE ALL BUS - Lista todas as BUs (para selects de admin)
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/globalClient";
import { queryKeys } from "@/lib/queryKeys";

interface BuOption {
  id: string;
  name: string;
}

export function useAllBus() {
  return useQuery({
    queryKey: queryKeys.bu.allList(),
    staleTime: 5 * 60 * 1000, // 5 minutes - BU list changes rarely
    queryFn: async (): Promise<BuOption[]> => {
      const { data, error } = await supabase
        .from("bu_units")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });
}
