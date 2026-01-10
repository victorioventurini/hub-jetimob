import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BuUnit, UserBuMembership } from "../types";

// Fetch all BUs the current user has access to
// NOTE: Uses global supabase client (not bu-scoped) because this runs
// BEFORE BuProvider is initialized - it's used to populate BuContext itself.
export function useUserBus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-bus", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      // Wave 5: Query memberships with bu_unit data
      // Uses direct join for compatibility during migration
      // (v_bu_memberships_active has profile-first columns, but lacks bu_unit details)
      const { data, error } = await supabaseClient
        .from("bu_user_memberships")
        .select(`
          id,
          user_id,
          profile_id,
          bu_id,
          role_in_bu,
          is_default,
          created_at,
          bu_unit:bu_units(
            id,
            name,
            description,
            logo_url,
            symbol_url,
            primary_color,
            status
          )
        `)
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (error) throw error;
      return (data || []) as UserBuMembership[];
    },
  });
}

// Fetch a single BU by ID
export function useBuUnit(buId: string | null) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ["bu-unit", buId],
    queryFn: async () => {
      if (!buId) return null;

      const { data, error } = await supabase
        .from("bu_units")
        .select("id, name, description, legal_entity, cnpj, allowed_email_domains, logo_url, symbol_url, primary_color, secondary_color, status, created_at, updated_at")
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
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ["all-bus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_units")
        .select("id, name, description, legal_entity, cnpj, allowed_email_domains, logo_url, symbol_url, primary_color, secondary_color, status, created_at, updated_at")
        .order("name");

      if (error) throw error;
      return data as BuUnit[];
    },
  });
}

// Check if email domain is allowed - requires supabase client injection
import { createBuScopedClient } from "@/integrations/supabase/useBuScopedSupabase";
import { supabase as supabaseGlobal } from "@/integrations/supabase/client";

export async function checkEmailDomainAllowed(email: string): Promise<{ allowed: boolean; buId: string | null }> {
  // This is called before BU context exists, so use global client
  const { data, error } = await supabaseGlobal
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
  const supabase = useBuScopedSupabase();

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
  const supabase = useBuScopedSupabase();

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
