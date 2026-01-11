import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import { assertSupabaseClient } from "@/lib/supabaseGuard";
import { queryKeys } from "@/lib/queryKeys";
import type { AssetGiftItem, AssetGiftBatch, AssetGiftMovement, GiftMovementType, GiftDestinationType } from "../types";

// Helper to format profile name
const formatProfileName = (p: { first_name: string | null; last_name: string | null; display_name: string | null }) => 
  p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome';

export interface UseGiftsOptions {
  search?: string;
}

export function useGifts(options: UseGiftsOptions = {}) {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useOptionalBuScopedSupabase();
  const buId = currentBu?.id;
  const { search } = options;

  // Buscar itens de brinde
  const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useQuery({
    queryKey: queryKeys.assets.gifts.items(buId ?? null, { search }),
    enabled: !!buId && !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      let query = supabase
        .from("asset_gift_items")
        .select("id, bu_id, name, category, status, notes, created_at, created_by, updated_at")
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("name");

      // Server-side text search
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`name.ilike.${term},category.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AssetGiftItem[];
    },
  });

  // Buscar lotes
  const { data: batches = [], isLoading: isLoadingBatches, refetch: refetchBatches } = useQuery({
    queryKey: queryKeys.assets.gifts.batches(buId ?? null),
    enabled: !!buId && !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("asset_gift_batches")
        .select(`
          *,
          gift_item:asset_gift_items!gift_item_id(id, name)
        `)
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AssetGiftBatch[];
    },
  });

  // Buscar movimentações
  const getMovements = async (giftItemId?: string): Promise<AssetGiftMovement[]> => {
    if (!supabase || !buId) return [];
    
    let query = supabase
      .from("asset_gift_movements")
      .select(`
        *,
        gift_item:asset_gift_items!gift_item_id(id, name),
        batch:asset_gift_batches!batch_id(id, batch_code)
      `)
      .eq("bu_id", buId)
      .order("occurred_at", { ascending: false });

    if (giftItemId) {
      query = query.eq("gift_item_id", giftItemId);
    }

    const { data, error } = await query;
    if (error) return [];

    // Fetch users separately
    const movements = data || [];
    const userIds = [...new Set(movements.map(m => m.performed_by_user_id).filter(Boolean))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, first_name, last_name, display_name").in("user_id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.user_id, {
      id: p.user_id,
      full_name: formatProfileName(p),
    }]));

    return movements.map(m => ({
      ...m,
      performed_by: m.performed_by_user_id ? profileMap.get(m.performed_by_user_id) || null : null,
    })) as AssetGiftMovement[];
  };

  // Calcular totais por item
  const getItemTotals = (itemId: string) => {
    const itemBatches = batches.filter(b => b.gift_item_id === itemId);
    const totalQuantity = itemBatches.reduce((sum, b) => sum + b.quantity_in, 0);
    const availableQuantity = itemBatches.reduce((sum, b) => sum + b.quantity_available, 0);
    return { totalQuantity, availableQuantity };
  };

  // Criar item de brinde
  const createItemMutation = useMutation({
    mutationFn: async (data: { name: string; category?: string; notes?: string }) => {
      const client = assertSupabaseClient(supabase, "createGiftItem");
      const { data: item, error } = await client
        .from("asset_gift_items")
        .insert({
          bu_id: buId!,
          created_by: user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.gifts.items(buId ?? null, undefined), exact: false });
      toast.success("Item criado");
    },
    onError: () => {
      toast.error("Erro ao criar item");
    },
  });

  // Atualizar item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, name, category, status, notes }: { id: string; name?: string; category?: string; status?: 'active' | 'inactive'; notes?: string }) => {
      const client = assertSupabaseClient(supabase, "updateGiftItem");
      const { data: item, error } = await client
        .from("asset_gift_items")
        .update({ name, category, status, notes })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.gifts.items(buId ?? null, undefined), exact: false });
      toast.success("Item atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar item");
    },
  });

  // Criar lote
  const createBatchMutation = useMutation({
    mutationFn: async (data: {
      gift_item_id: string;
      batch_code?: string;
      acquired_at?: string;
      quantity_in: number;
      cost_center?: string;
      campaign?: string;
      notes?: string;
    }) => {
      const client = assertSupabaseClient(supabase, "createGiftBatch");
      const { data: batch, error } = await client
        .from("asset_gift_batches")
        .insert({
          bu_id: buId!,
          created_by: user?.id,
          quantity_available: data.quantity_in,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.gifts.batches(buId ?? null) });
      toast.success("Lote criado");
    },
    onError: () => {
      toast.error("Erro ao criar lote");
    },
  });

  // Criar movimentação
  const createMovementMutation = useMutation({
    mutationFn: async (data: {
      gift_item_id: string;
      batch_id?: string;
      movement_type: GiftMovementType;
      quantity: number;
      destination_type?: GiftDestinationType;
      destination_description?: string;
      notes?: string;
    }) => {
      const client = assertSupabaseClient(supabase, "createGiftMovement");
      
      // Validar estoque para saídas
      if (data.movement_type === 'out' && data.batch_id) {
        const batch = batches.find(b => b.id === data.batch_id);
        if (batch && batch.quantity_available < data.quantity) {
          throw new Error(`Estoque insuficiente. Disponível: ${batch.quantity_available}`);
        }
      }

      const { data: movement, error } = await client
        .from("asset_gift_movements")
        .insert({
          bu_id: buId!,
          performed_by_user_id: user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.gifts.batches(buId ?? null) });
      toast.success("Movimentação registrada");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao registrar movimentação");
    },
  });

  return {
    items,
    batches,
    isLoading: isLoadingItems || isLoadingBatches,
    getMovements,
    getItemTotals,
    createItem: createItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    createBatch: createBatchMutation.mutate,
    createMovement: createMovementMutation.mutate,
    isCreatingItem: createItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isCreatingBatch: createBatchMutation.isPending,
    isCreatingMovement: createMovementMutation.isPending,
    refetchItems,
    refetchBatches,
  };
}
