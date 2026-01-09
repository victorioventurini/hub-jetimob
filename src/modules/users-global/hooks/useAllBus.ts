// ============================================================
// USE ALL BUS - Lista todas as BUs (para selects de admin)
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

interface BuOption {
  id: string;
  name: string;
}

export function useAllBus() {
  return useQuery({
    queryKey: queryKeys.bu.allList(),
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
