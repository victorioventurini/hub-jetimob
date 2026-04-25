/**
 * usePrefetchRoute — W3.P3.5
 *
 * Helper para disparar prefetch de queries ao passar o mouse sobre
 * itens de navegação. Reduz a latência percebida em 200–500ms.
 *
 * Uso:
 *   const prefetch = usePrefetchRoute();
 *   <Link to="/tickets" onMouseEnter={() => prefetch("/tickets")} />
 *
 * Apenas rotas com handler conhecido fazem prefetch — chamadas para
 * paths não mapeados são silenciosamente ignoradas (sem custo).
 *
 * IMPORTANTE (TCR §A.3):
 * - Prefetch usa cliente BU-scoped (header `x-current-bu-id`).
 * - Prefetch é DESLIGADO durante uma troca de BU (`isSwitchingBu`) para
 *   evitar disparar requests com a BU antiga durante a janela de transição
 *   (ver mem://standards/bu-selection-race-protection).
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useBu } from "@/contexts/BuContext";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import type { Database } from "@/integrations/supabase/types";

type Prefetcher = (
  queryClient: ReturnType<typeof useQueryClient>,
  ctx: { buId: string; supabase: SupabaseClient<Database> },
) => Promise<unknown>;

/**
 * Mapeamento conservador: somente rotas críticas e idempotentes.
 * Cada handler deve ser idempotente e usar a mesma queryKey do hook real.
 */
const ROUTE_PREFETCHERS: Record<string, Prefetcher> = {
  "/": async (qc, { buId, supabase }) => {
    return qc.prefetchQuery({
      queryKey: ["bu", buId, "home", "summary"],
      queryFn: async () => {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);
        return data;
      },
      staleTime: 60_000,
    });
  },
  "/tickets": async (qc, { buId, supabase }) => {
    return qc.prefetchQuery({
      queryKey: ["bu", buId, "tickets", "list", "preview"],
      queryFn: async () => {
        const { data } = await supabase
          .from("tickets")
          .select("id, title, status, priority, updated_at")
          .eq("bu_id", buId)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(20);
        return data;
      },
      staleTime: 30_000,
    });
  },
  "/okrs": async (qc, { buId, supabase }) => {
    return qc.prefetchQuery({
      queryKey: ["bu", buId, "okrs", "objectives", "preview"],
      queryFn: async () => {
        const { data } = await supabase
          .from("okr_team_objectives")
          .select("id, title, status")
          .eq("bu_id", buId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(10);
        return data;
      },
      staleTime: 60_000,
    });
  },
};

export function usePrefetchRoute() {
  const queryClient = useQueryClient();
  const { currentBu, isSwitchingBu } = useBu();
  const buId = currentBu?.id ?? null;
  const supabase = useOptionalBuScopedSupabase();

  return useCallback(
    (route: string) => {
      // Gate: durante uma troca de BU, o header `x-current-bu-id` pode estar
      // em transição. Disparar prefetch agora cacheia dados da BU errada.
      if (isSwitchingBu) return;
      if (!buId || !supabase) return;

      const matchKey = Object.keys(ROUTE_PREFETCHERS).find((key) =>
        key === "/" ? route === "/" : route === key || route.startsWith(`${key}/`),
      );
      if (!matchKey) return;
      const handler = ROUTE_PREFETCHERS[matchKey];
      // Fire-and-forget; erros silenciados (best-effort)
      void handler(queryClient, { buId, supabase }).catch(() => {});
    },
    [queryClient, buId, supabase, isSwitchingBu],
  );
}
