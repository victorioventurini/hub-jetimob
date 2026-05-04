/**
 * Resolve em qual BU um ticket está, quando o usuário tem permissão para vê-lo.
 *
 * Usa RPC SECURITY DEFINER (`resolve_ticket_bu_for_user`) que ignora o header
 * de BU atual — necessário para detectar quando o usuário abriu o link de um
 * ticket que pertence a outra BU acessível, e oferecer a troca.
 *
 * Pré-BU friendly: usa o globalClient (não precisa de header `x-current-bu-id`).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/globalClient";
import { useAuth } from "@/hooks/useAuth";

export function useResolveTicketBu(ticketId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tickets", "resolve-bu", user?.id ?? null, ticketId ?? null],
    enabled: !!ticketId && !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      if (!ticketId) return null;
      const { data, error } = await supabase.rpc("resolve_ticket_bu_for_user", {
        p_ticket_id: ticketId,
      });
      if (error) {
        console.error("[useResolveTicketBu] rpc error", error);
        return null;
      }
      return (data as string | null) ?? null;
    },
  });
}
