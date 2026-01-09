// ============================================================
// USE OPTIMISTIC MUTATION - Hub da Jet
// ============================================================
// Hook utilitário para mutações com atualização otimista do cache
// Remove/oculta itens imediatamente da UI antes da confirmação do servidor
// ============================================================

import { useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

interface OptimisticDeleteOptions<TData, TVariables> {
  /** Query key(s) to update optimistically */
  queryKey: QueryKey;
  /** Function to perform the actual mutation */
  mutationFn: (variables: TVariables) => Promise<void>;
  /** Extract the ID from variables to identify the item to remove */
  getItemId: (variables: TVariables) => string;
  /** Success message */
  successMessage?: string;
  /** Error message */
  errorMessage?: string;
  /** 
   * Optional: Custom filter function if data is not a simple array
   * Default assumes data is an array and filters by id
   */
  filterFn?: (data: TData, itemId: string) => TData;
  /** Additional query keys to invalidate on success */
  invalidateKeys?: QueryKey[];
}

/**
 * Hook para delete/inativação com atualização otimista
 * Remove o item da UI imediatamente, revertendo em caso de erro
 * 
 * @example
 * const deleteTeam = useOptimisticDelete({
 *   queryKey: queryKeys.teams.list(buId),
 *   mutationFn: async (teamId) => {
 *     await supabase.from('teams').update({ deleted_at: now() }).eq('id', teamId);
 *   },
 *   getItemId: (teamId) => teamId,
 *   successMessage: "Time excluído",
 * });
 */
export function useOptimisticDelete<TData = unknown[], TVariables = string>({
  queryKey,
  mutationFn,
  getItemId,
  successMessage = "Item removido com sucesso",
  errorMessage = "Erro ao remover item",
  filterFn,
  invalidateKeys = [],
}: OptimisticDeleteOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    
    // Optimistic update: remove from cache immediately
    onMutate: async (variables) => {
      const itemId = getItemId(variables);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot current data
      const previousData = queryClient.getQueryData<TData>(queryKey);
      
      // Optimistically update cache
      if (previousData !== undefined) {
        if (filterFn) {
          queryClient.setQueryData(queryKey, filterFn(previousData, itemId));
        } else if (Array.isArray(previousData)) {
          queryClient.setQueryData(
            queryKey,
            previousData.filter((item: { id?: string }) => item?.id !== itemId)
          );
        }
      }
      
      return { previousData };
    },
    
    // Rollback on error
    onError: (error, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      console.error("Optimistic delete error:", error);
      toast.error(errorMessage);
    },
    
    // Refetch on success to ensure consistency
    onSuccess: () => {
      toast.success(successMessage);
      // Invalidate to sync with server (background)
      queryClient.invalidateQueries({ queryKey });
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}

interface OptimisticUpdateOptions<TData, TVariables, TItem> {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<void>;
  getItemId: (variables: TVariables) => string;
  getUpdatedFields: (variables: TVariables) => Partial<TItem>;
  successMessage?: string;
  errorMessage?: string;
  invalidateKeys?: QueryKey[];
}

/**
 * Hook para update com atualização otimista
 * Atualiza o item na UI imediatamente, revertendo em caso de erro
 */
export function useOptimisticUpdate<TData = unknown[], TVariables = unknown, TItem = Record<string, unknown>>({
  queryKey,
  mutationFn,
  getItemId,
  getUpdatedFields,
  successMessage = "Item atualizado com sucesso",
  errorMessage = "Erro ao atualizar item",
  invalidateKeys = [],
}: OptimisticUpdateOptions<TData, TVariables, TItem>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    
    onMutate: async (variables) => {
      const itemId = getItemId(variables);
      const updates = getUpdatedFields(variables);
      
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<TData>(queryKey);
      
      if (previousData !== undefined && Array.isArray(previousData)) {
        queryClient.setQueryData(
          queryKey,
          previousData.map((item: TItem & { id?: string }) =>
            item?.id === itemId ? { ...item, ...updates } : item
          )
        );
      }
      
      return { previousData };
    },
    
    onError: (error, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      console.error("Optimistic update error:", error);
      toast.error(errorMessage);
    },
    
    onSuccess: () => {
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey });
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}

/**
 * Helper para fechar modal/sheet após mutação bem-sucedida
 * Uso: onSuccess: closeAndInvalidate(() => setOpen(false))
 */
export function createSuccessHandler(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKeys: QueryKey[],
  onClose?: () => void,
  successMessage?: string
) {
  return () => {
    if (successMessage) {
      toast.success(successMessage);
    }
    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
    onClose?.();
  };
}
