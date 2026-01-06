/**
 * BU Scope Helpers
 * Ensures all operations are scoped to the current BU
 */

import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";

/**
 * Hook to get the current BU ID with validation
 * Throws/shows error if no BU is selected
 */
export function useCurrentBuId() {
  const { currentBuId, currentBu, isLoading } = useBu();

  const requireBuId = (): string => {
    if (!currentBuId) {
      toast.error("Nenhuma BU selecionada. Por favor, selecione uma BU.");
      throw new Error("NO_BU_SELECTED");
    }
    return currentBuId;
  };

  return {
    buId: currentBuId,
    bu: currentBu,
    isLoading,
    requireBuId,
  };
}

/**
 * Helper to inject bu_id into insert payloads
 */
export function withBuId<T extends object>(
  payload: T,
  buId: string | null
): T & { bu_id: string } {
  if (!buId) {
    throw new Error("MISSING_BU_ID: Cannot create record without bu_id");
  }
  return { ...payload, bu_id: buId };
}

/**
 * Handle BU scope errors from Supabase
 */
export function handleBuError(error: { message?: string; code?: string }) {
  const msg = error.message || "";
  
  if (msg.includes("BU_SCOPE_VIOLATION")) {
    toast.error("Erro de escopo: Você não pode operar em dados de outra BU.");
  } else if (msg.includes("MISSING_BU_ID")) {
    toast.error("Erro: Operação requer uma BU selecionada.");
  } else if (msg.includes("NO_BU_CONTEXT")) {
    toast.error("Erro: Nenhum contexto de BU disponível. Recarregue a página.");
  }
}
