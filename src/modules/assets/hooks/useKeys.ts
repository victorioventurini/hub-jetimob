import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import type { AssetClaviculary, AssetHook, AssetKeyring, AssetKey, AssetKeyMovement, KeyMovementType } from "../types";

// Helper to format profile name
const formatProfileName = (p: { first_name: string | null; last_name: string | null; display_name: string | null }) => 
  p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome';

export function useKeys() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const buId = currentBu?.id;

  // Buscar claviculários
  const { data: clavicularies = [], isLoading: isLoadingClavicularies, refetch: refetchClavicularies } = useQuery({
    queryKey: ["asset-clavicularies", buId],
    enabled: !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_clavicularies")
        .select("*")
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;

      // Fetch locations separately
      const locationIds = [...new Set((data || []).map(c => c.location_id).filter(Boolean))];
      const { data: locations } = locationIds.length > 0
        ? await supabase.from("bu_locations").select("id, name").in("id", locationIds)
        : { data: [] };

      const locationMap = new Map((locations || []).map(l => [l.id, l]));

      return (data || []).map(c => ({
        ...c,
        location: c.location_id ? locationMap.get(c.location_id) || null : null,
      })) as AssetClaviculary[];
    },
  });

  // Buscar ganchos de um claviculário
  const getHooks = async (clavicularyId: string): Promise<AssetHook[]> => {
    const { data, error } = await supabase
      .from("asset_hooks")
      .select("*")
      .eq("claviculary_id", clavicularyId)
      .order("hook_number");

    if (error) return [];
    return data as AssetHook[];
  };

  // Buscar chaveiros
  const { data: keyrings = [], isLoading: isLoadingKeyrings, refetch: refetchKeyrings } = useQuery({
    queryKey: ["asset-keyrings", buId],
    enabled: !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_keyrings")
        .select(`
          *,
          claviculary:asset_clavicularies!claviculary_id(id, name),
          hook:asset_hooks!hook_id(id, hook_number)
        `)
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("tag_number");

      if (error) throw error;

      // Fetch users separately
      const userIds = [...new Set((data || []).map(k => k.current_user_id).filter(Boolean))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, first_name, last_name, display_name, photo_url").in("user_id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.user_id, {
        id: p.user_id,
        full_name: formatProfileName(p),
        avatar_url: p.photo_url,
      }]));

      return (data || []).map(k => ({
        ...k,
        current_user: k.current_user_id ? profileMap.get(k.current_user_id) || null : null,
      })) as AssetKeyring[];
    },
  });

  // Buscar chaves
  const { data: keys = [], isLoading: isLoadingKeys, refetch: refetchKeys } = useQuery({
    queryKey: ["asset-keys", buId],
    enabled: !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_keys")
        .select(`
          *,
          keyring:asset_keyrings!keyring_id(id, name, tag_number)
        `)
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("tag_number");

      if (error) throw error;
      return data as AssetKey[];
    },
  });

  // Buscar movimentações de um chaveiro
  const getKeyMovements = async (keyringId: string): Promise<AssetKeyMovement[]> => {
    const { data, error } = await supabase
      .from("asset_key_movements")
      .select(`
        *,
        from_claviculary:asset_clavicularies!from_claviculary_id(id, name),
        to_claviculary:asset_clavicularies!to_claviculary_id(id, name)
      `)
      .eq("keyring_id", keyringId)
      .order("occurred_at", { ascending: false });

    if (error) return [];

    // Fetch users separately
    const movements = data || [];
    const userIds = [...new Set(movements.flatMap(m => [m.user_id, m.authorized_by_user_id, m.performed_by_user_id].filter(Boolean)))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, first_name, last_name, display_name").in("user_id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.user_id, {
      id: p.user_id,
      full_name: formatProfileName(p),
    }]));

    return movements.map(m => ({
      ...m,
      user: m.user_id ? profileMap.get(m.user_id) || null : null,
      authorized_by: m.authorized_by_user_id ? profileMap.get(m.authorized_by_user_id) || null : null,
      performed_by: m.performed_by_user_id ? profileMap.get(m.performed_by_user_id) || null : null,
    })) as AssetKeyMovement[];
  };

  // Criar claviculário
  const createClavicularyMutation = useMutation({
    mutationFn: async (data: { name: string; location_id?: string; notes?: string }) => {
      const { data: claviculary, error } = await supabase
        .from("asset_clavicularies")
        .insert({
          bu_id: buId!,
          created_by: user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return claviculary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-clavicularies", buId] });
      toast.success("Claviculário criado");
    },
    onError: () => {
      toast.error("Erro ao criar claviculário");
    },
  });

  // Criar gancho
  const createHookMutation = useMutation({
    mutationFn: async (data: { claviculary_id: string; hook_number: number; notes?: string }) => {
      const { data: hook, error } = await supabase
        .from("asset_hooks")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return hook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-clavicularies", buId] });
      toast.success("Gancho criado");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Número de gancho já existe neste claviculário");
      } else {
        toast.error("Erro ao criar gancho");
      }
    },
  });

  // Criar múltiplos ganchos
  const createHooksMutation = useMutation({
    mutationFn: async ({ clavicularyId, count }: { clavicularyId: string; count: number }) => {
      const hooks = Array.from({ length: count }, (_, i) => ({
        claviculary_id: clavicularyId,
        hook_number: i + 1,
      }));

      const { error } = await supabase
        .from("asset_hooks")
        .insert(hooks);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-clavicularies", buId] });
      toast.success("Ganchos criados");
    },
    onError: () => {
      toast.error("Erro ao criar ganchos");
    },
  });

  // Criar chaveiro
  const createKeyringMutation = useMutation({
    mutationFn: async (data: { name: string; tag_number: string; claviculary_id?: string; hook_id?: string; notes?: string }) => {
      const { data: keyring, error } = await supabase
        .from("asset_keyrings")
        .insert({
          bu_id: buId!,
          created_by: user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      // Se vinculado a um hook, marcar como ocupado
      if (data.hook_id) {
        await supabase
          .from("asset_hooks")
          .update({ occupied: true })
          .eq("id", data.hook_id);
      }

      return keyring;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-keyrings", buId] });
      queryClient.invalidateQueries({ queryKey: ["asset-clavicularies", buId] });
      toast.success("Chaveiro criado");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Número de etiqueta já existe");
      } else {
        toast.error("Erro ao criar chaveiro");
      }
    },
  });

  // Criar chave
  const createKeyMutation = useMutation({
    mutationFn: async (data: { tag_number: string; description?: string; access_type?: 'door' | 'padlock' | 'gate' | 'other'; keyring_id?: string; notes?: string }) => {
      const { data: key, error } = await supabase
        .from("asset_keys")
        .insert({
          bu_id: buId!,
          created_by: user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return key;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-keys", buId] });
      toast.success("Chave criada");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Número de etiqueta já existe");
      } else {
        toast.error("Erro ao criar chave");
      }
    },
  });

  // Criar movimentação de chaveiro
  const createKeyMovementMutation = useMutation({
    mutationFn: async (data: {
      keyring_id: string;
      movement_type: KeyMovementType;
      user_id?: string;
      from_claviculary_id?: string;
      from_hook_id?: string;
      to_claviculary_id?: string;
      to_hook_id?: string;
      authorized_by_user_id?: string;
      due_at?: string;
      notes?: string;
    }) => {
      // Validar retorno: hook_number deve bater com tag_number
      if (data.movement_type === 'return' && data.to_hook_id) {
        const keyring = keyrings.find(k => k.id === data.keyring_id);
        const { data: hook } = await supabase
          .from("asset_hooks")
          .select("hook_number")
          .eq("id", data.to_hook_id)
          .single();

        if (keyring && hook && String(hook.hook_number) !== keyring.tag_number) {
          throw new Error(`Número do gancho (${hook.hook_number}) não corresponde à etiqueta do chaveiro (${keyring.tag_number})`);
        }
      }

      const { data: movement, error } = await supabase
        .from("asset_key_movements")
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
      queryClient.invalidateQueries({ queryKey: ["asset-keyrings", buId] });
      queryClient.invalidateQueries({ queryKey: ["asset-clavicularies", buId] });
      toast.success("Movimentação registrada");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao registrar movimentação");
    },
  });

  return {
    clavicularies,
    keyrings,
    keys,
    isLoading: isLoadingClavicularies || isLoadingKeyrings || isLoadingKeys,
    getHooks,
    getKeyMovements,
    createClaviculary: createClavicularyMutation.mutate,
    createHook: createHookMutation.mutate,
    createHooks: createHooksMutation.mutate,
    createKeyring: createKeyringMutation.mutate,
    createKey: createKeyMutation.mutate,
    createKeyMovement: createKeyMovementMutation.mutate,
    isCreatingClaviculary: createClavicularyMutation.isPending,
    isCreatingHook: createHookMutation.isPending,
    isCreatingKeyring: createKeyringMutation.isPending,
    isCreatingKey: createKeyMutation.isPending,
    isCreatingKeyMovement: createKeyMovementMutation.isPending,
    refetchClavicularies,
    refetchKeyrings,
    refetchKeys,
  };
}
