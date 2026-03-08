/**
 * usePhoneLines — Query + Mutations for Phone Lines submodule
 * 
 * Uses BU-scoped Supabase client, explicit bu_id filtering, soft delete.
 * @see docs/canonical/IDENTITY_CONVENTION.md
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useIdentity } from "@/hooks/useIdentity";
import { useBu } from "@/contexts/BuContext";
import { assetsKeys } from "@/lib/queryKeys/assets";
import { assertSupabaseClient } from "@/lib/supabaseGuard";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────

export type PhoneLineStatus = "available" | "loaned";
export type PhoneLinePlanType = "prepaid" | "postpaid";

export interface PhoneLine {
  id: string;
  bu_id: string;
  phone_number: string;
  carrier: string | null;
  plan_type: PhoneLinePlanType;
  status: PhoneLineStatus;
  current_user_id: string | null;
  linked_asset_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  current_user?: { id: string; display_name: string | null; photo_url: string | null } | null;
  linked_asset?: { id: string; name: string; internal_code: string; status: string } | null;
}

export interface PhoneLineFilters {
  search?: string;
  status?: PhoneLineStatus | "all";
  carrier?: string;
}

// ── Select fields ──────────────────────────────────────

const PHONE_LINE_FIELDS = `
  id, bu_id, phone_number, carrier, plan_type, status,
  current_user_id, linked_asset_id, notes,
  created_at, updated_at, deleted_at,
  current_user:profiles!asset_phone_lines_current_user_id_fkey(
    id, display_name, photo_url
  ),
  linked_asset:asset_inventory!asset_phone_lines_linked_asset_id_fkey(
    id, name, internal_code, status
  )
`;

// ── List query ─────────────────────────────────────────

export function usePhoneLinesQuery(filters?: PhoneLineFilters) {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: assetsKeys.phoneLines.list(currentBuId ?? null, filters as Record<string, unknown>),
    queryFn: async () => {
      const client = assertSupabaseClient(supabase, "usePhoneLinesQuery");
      let query = client
        .from("asset_phone_lines")
        .select(PHONE_LINE_FIELDS)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("phone_number", { ascending: true });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.carrier) {
        query = query.eq("carrier", filters.carrier);
      }
      if (filters?.search) {
        query = query.or(
          `phone_number.ilike.%${filters.search}%,carrier.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as PhoneLine[];
    },
    enabled: !!currentBuId && !!supabase,
  });
}

// ── Carriers query (autocomplete) ──────────────────────

export function usePhoneLineCarriersQuery() {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();

  return useQuery({
    queryKey: assetsKeys.phoneLines.carriers(currentBuId ?? null),
    queryFn: async () => {
      const client = assertSupabaseClient(supabase, "usePhoneLineCarriersQuery");
      const { data, error } = await client
        .from("asset_phone_lines")
        .select("carrier")
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .not("carrier", "is", null)
        .order("carrier");

      if (error) throw error;
      const unique = [...new Set((data ?? []).map(d => d.carrier).filter(Boolean))] as string[];
      return unique;
    },
    enabled: !!currentBuId && !!supabase,
  });
}

// ── Mutations ──────────────────────────────────────────

interface CreatePhoneLineInput {
  phone_number: string;
  carrier?: string | null;
  plan_type: PhoneLinePlanType;
  status: PhoneLineStatus;
  current_user_id?: string | null;
  linked_asset_id?: string | null;
  notes?: string | null;
}

interface UpdatePhoneLineInput extends Partial<CreatePhoneLineInput> {
  id: string;
}

export function usePhoneLineMutations() {
  const queryClient = useQueryClient();
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: assetsKeys.phoneLines.all(currentBuId ?? null),
      refetchType: "active",
    });
  };

  const createMutation = useMutation({
    mutationFn: async (input: CreatePhoneLineInput) => {
      const client = assertSupabaseClient(supabase, "createPhoneLine");
      const { data, error } = await client
        .from("asset_phone_lines")
        .insert({
          bu_id: currentBuId!,
          phone_number: input.phone_number,
          carrier: input.carrier ?? null,
          plan_type: input.plan_type,
          status: input.status,
          current_user_id: input.status === "loaned" ? input.current_user_id ?? null : null,
          linked_asset_id: input.linked_asset_id ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Linha telefônica cadastrada");
    },
    onError: (err: any) => {
      if (err?.code === "23505") {
        toast.error("Este número já está cadastrado nesta unidade");
      } else {
        toast.error("Erro ao cadastrar linha telefônica");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdatePhoneLineInput) => {
      const client = assertSupabaseClient(supabase, "updatePhoneLine");
      const payload: Record<string, unknown> = { ...input };
      // If status changed to available, clear current_user_id
      if (input.status === "available") {
        payload.current_user_id = null;
      }
      const { data, error } = await client
        .from("asset_phone_lines")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Linha telefônica atualizada");
    },
    onError: (err: any) => {
      if (err?.code === "23505") {
        toast.error("Este número já está cadastrado nesta unidade");
      } else {
        toast.error("Erro ao atualizar linha telefônica");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = assertSupabaseClient(supabase, "deletePhoneLine");
      const { error } = await client
        .from("asset_phone_lines")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Linha telefônica removida");
    },
    onError: () => {
      toast.error("Erro ao remover linha telefônica");
    },
  });

  const loanMutation = useMutation({
    mutationFn: async ({ id, current_user_id }: { id: string; current_user_id: string }) => {
      const client = assertSupabaseClient(supabase, "loanPhoneLine");
      const { data, error } = await client
        .from("asset_phone_lines")
        .update({ status: "loaned", current_user_id })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Linha emprestada");
    },
    onError: () => {
      toast.error("Erro ao emprestar linha");
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = assertSupabaseClient(supabase, "returnPhoneLine");
      const { data, error } = await client
        .from("asset_phone_lines")
        .update({ status: "available", current_user_id: null })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Linha devolvida");
    },
    onError: () => {
      toast.error("Erro ao devolver linha");
    },
  });

  return {
    createPhoneLine: createMutation,
    updatePhoneLine: updateMutation,
    deletePhoneLine: deleteMutation,
    loanPhoneLine: loanMutation,
    returnPhoneLine: returnMutation,
  };
}
