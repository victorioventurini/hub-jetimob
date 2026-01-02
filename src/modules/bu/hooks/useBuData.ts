import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BuUnit, UserBuMembership } from "../types";

// Fetch all BUs the current user has access to
export function useUserBus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-bus", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("bu_user_memberships")
        .select(`
          *,
          bu_unit:bu_units(*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data as UserBuMembership[];
    },
  });
}

// Fetch a single BU by ID
export function useBuUnit(buId: string | null) {
  return useQuery({
    queryKey: ["bu-unit", buId],
    queryFn: async () => {
      if (!buId) return null;

      const { data, error } = await supabase
        .from("bu_units")
        .select("*")
        .eq("id", buId)
        .single();

      if (error) throw error;
      return data as BuUnit;
    },
    enabled: !!buId,
  });
}

// Fetch all BUs (admin only)
export function useAllBus() {
  return useQuery({
    queryKey: ["all-bus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_units")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as BuUnit[];
    },
  });
}

// Check if email domain is allowed
export async function checkEmailDomainAllowed(email: string): Promise<{ allowed: boolean; buId: string | null }> {
  const { data, error } = await supabase
    .rpc("get_bu_by_email_domain", { p_email: email });

  if (error) {
    console.error("Error checking email domain:", error);
    return { allowed: false, buId: null };
  }

  return { allowed: !!data, buId: data };
}

// Create a new BU (admin only)
export function useCreateBu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bu: {
      name: string;
      description?: string;
      legal_entity?: string;
      allowed_email_domains: string[];
    }) => {
      const { data, error } = await supabase
        .from("bu_units")
        .insert(bu)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-bus"] });
    },
  });
}

// Update a BU (admin only)
export function useUpdateBu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BuUnit> & { id: string }) => {
      const { data, error } = await supabase
        .from("bu_units")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-bus"] });
      queryClient.invalidateQueries({ queryKey: ["bu-unit", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["user-bus"] });
    },
  });
}
