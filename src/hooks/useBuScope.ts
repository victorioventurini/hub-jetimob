/**
 * BU Scope Helpers
 * Ensures all operations are scoped to the current BU
 */

import { useBu } from "@/contexts/BuContext";
import { supabase } from "@/integrations/supabase/client";
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
 * Hook providing BU-scoped mutation helpers
 */
export function useBuScopedMutation() {
  const { currentBuId } = useBu();

  /**
   * Insert with automatic bu_id injection
   */
  const insertBu = async <T extends object>(
    table: string,
    payload: T | T[]
  ) => {
    if (!currentBuId) {
      throw new Error("MISSING_BU_ID: No BU context available");
    }

    const payloads = Array.isArray(payload) ? payload : [payload];
    const withBu = payloads.map((p) => ({ ...p, bu_id: currentBuId }));

    const { data, error } = await supabase
      .from(table)
      .insert(withBu as any)
      .select();

    if (error) {
      handleBuError(error);
      throw error;
    }

    return Array.isArray(payload) ? data : data?.[0];
  };

  /**
   * Update with bu_id validation in filter
   */
  const updateBu = async <T extends object>(
    table: string,
    id: string,
    payload: T
  ) => {
    if (!currentBuId) {
      throw new Error("MISSING_BU_ID: No BU context available");
    }

    const { data, error } = await supabase
      .from(table)
      .update(payload as any)
      .eq("id", id)
      .eq("bu_id", currentBuId)
      .select()
      .single();

    if (error) {
      handleBuError(error);
      throw error;
    }

    return data;
  };

  /**
   * Select with automatic bu_id filter
   */
  const selectBu = (table: string) => {
    if (!currentBuId) {
      throw new Error("MISSING_BU_ID: No BU context available");
    }

    return supabase.from(table).select().eq("bu_id", currentBuId);
  };

  return {
    buId: currentBuId,
    insertBu,
    updateBu,
    selectBu,
  };
}

/**
 * Handle BU scope errors from Supabase
 */
function handleBuError(error: { message?: string; code?: string }) {
  const msg = error.message || "";
  
  if (msg.includes("BU_SCOPE_VIOLATION")) {
    toast.error("Erro de escopo: Você não pode operar em dados de outra BU.");
  } else if (msg.includes("MISSING_BU_ID")) {
    toast.error("Erro: Operação requer uma BU selecionada.");
  } else if (msg.includes("NO_BU_CONTEXT")) {
    toast.error("Erro: Nenhum contexto de BU disponível. Recarregue a página.");
  }
}

export { handleBuError };
