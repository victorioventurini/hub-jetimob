import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { TicketCategory, TicketSubcategory, TicketCategoryScope, CatalogStatus } from "../types";

// ===========================================
// CATEGORIES
// ===========================================

export function useTicketCategories(scope?: TicketCategoryScope) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.categories(buId ?? null, scope),
    staleTime: 5 * 60 * 1000, // 5 minutes - categories change rarely
    queryFn: async () => {
      if (!buId) return [];

      let query = supabase
        .from("ticket_categories")
        .select(`
          id, bu_id, name, description, scope, status, created_at, updated_at,
          subcategories:ticket_subcategories(id, name, status, default_initial_message)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name");

      if (scope) {
        query = query.in("scope", [scope, "both"]);
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
      // Invalidate all category queries for this BU (any scope)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.categoriesPrefix(buId ?? null),
        exact: false 
      });
    },
  });
}

export function useUpdateTicketCategory() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
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
      status?: CatalogStatus;
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
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.categoriesPrefix(buId ?? null),
        exact: false 
      });
    },
  });
}

export function useDeleteTicketCategory() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
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
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.categoriesPrefix(buId ?? null),
        exact: false 
      });
    },
  });
}

// ===========================================
// SUBCATEGORIES
// ===========================================
//
// NOTE: O hook GET `useTicketSubcategories` foi removido em 2026-04-30
// (Onda 5 — limpeza @deprecated). As subcategorias já vêm embutidas em
// `useTicketCategories()` (campo `subcategories` por categoria).
// Os hooks Create/Update/Delete abaixo continuam disponíveis.

export function useCreateTicketSubcategory() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: { category_id: string; name: string; default_initial_message?: string | null }) => {
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
          default_initial_message: data.default_initial_message || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return subcategory as TicketSubcategory;
    },
    onSuccess: () => {
      // Invalidate categories (which include subcategories in nested query)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.categoriesPrefix(buId ?? null),
        exact: false 
      });
      // Invalidate subcategories
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.subcategoriesPrefix(buId ?? null),
        exact: false 
      });
    },
  });
}

export function useUpdateTicketSubcategory() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      status?: CatalogStatus;
      default_initial_message?: string | null;
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
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.categoriesPrefix(buId ?? null),
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.subcategoriesPrefix(buId ?? null),
        exact: false 
      });
    },
  });
}

export function useDeleteTicketSubcategory() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
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
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.categoriesPrefix(buId ?? null),
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.subcategoriesPrefix(buId ?? null),
        exact: false 
      });
    },
  });
}
