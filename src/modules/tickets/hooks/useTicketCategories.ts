import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { TicketCategory, TicketSubcategory, TicketCategoryScope } from "../types";

// ===========================================
// CATEGORIES
// ===========================================

export function useTicketCategories(scope?: TicketCategoryScope) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.categories(buId ?? null, scope),
    queryFn: async () => {
      if (!buId) return [];

      let query = supabase
        .from("ticket_categories")
        .select(`
          *,
          subcategories:ticket_subcategories(id, name, status)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name");

      if (scope) {
        query = query.or(`scope.eq.${scope},scope.eq.both`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((cat: any) => ({
        ...cat,
        subcategories: (cat.subcategories || []).filter(
          (sub: any) => sub.status === "active"
        ),
      })) as TicketCategory[];
    },
    enabled: !!buId,
  });
}

export function useCreateTicketCategory() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      scope: TicketCategoryScope;
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: category, error } = await supabase
        .from("ticket_categories")
        .insert({
          bu_id: buId,
          name: data.name,
          description: data.description || null,
          scope: data.scope,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return category as TicketCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-categories"] });
    },
  });
}

export function useUpdateTicketCategory() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string | null;
      scope?: TicketCategoryScope;
      status?: string;
    }) => {
      const { data: category, error } = await supabase
        .from("ticket_categories")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return category as TicketCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-categories"] });
    },
  });
}

export function useDeleteTicketCategory() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ticket_categories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-categories"] });
    },
  });
}

// ===========================================
// SUBCATEGORIES
// ===========================================

export function useTicketSubcategories(categoryId?: string) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.subcategories(buId ?? null, categoryId),
    queryFn: async () => {
      if (!buId) return [];

      let query = supabase
        .from("ticket_subcategories")
        .select(`
          *,
          category:ticket_categories(id, name)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name");

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as TicketSubcategory[];
    },
    enabled: !!buId,
  });
}

export function useCreateTicketSubcategory() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: { category_id: string; name: string }) => {
      if (!buId) throw new Error("BU não selecionada");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: subcategory, error } = await supabase
        .from("ticket_subcategories")
        .insert({
          bu_id: buId,
          category_id: data.category_id,
          name: data.name,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return subcategory as TicketSubcategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.categories(null, undefined) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.subcategories(null, undefined) });
    },
  });
}

export function useUpdateTicketSubcategory() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      status?: string;
    }) => {
      const { data: subcategory, error } = await supabase
        .from("ticket_subcategories")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return subcategory as TicketSubcategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-categories"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-subcategories"] });
    },
  });
}

export function useDeleteTicketSubcategory() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ticket_subcategories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-categories"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-subcategories"] });
    },
  });
}
