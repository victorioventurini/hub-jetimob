import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { queryKeys } from "@/lib/queryKeys";
import type { BuLocation, BuLocationFormData } from "../types/location";

export function useBuLocations(buId: string | null) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.bu.locations(buId),
    staleTime: 5 * 60 * 1000, // 5 minutes - locations change rarely
    queryFn: async () => {
      if (!buId) return [];
      
      const { data, error } = await supabase
        .from("bu_locations")
        .select(`
          id, bu_id, name, type, status, is_default,
          parent_location_id, formatted_address,
          address_line_1, address_line_2, district,
          city, state, country, postal_code,
          latitude, longitude, google_place_id,
          timezone, notes,
          created_at, created_by, updated_at, updated_by, deleted_at,
          parent:parent_location_id(id, name)
        `)
        .is("deleted_at", null)
        .order("parent_location_id", { nullsFirst: true })
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as BuLocation[];
    },
    enabled: !!buId,
  });
}

export function useBuLocation(locationId: string | null) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.bu.location(locationId ?? ''),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!locationId) return null;
      
      const { data, error } = await supabase
        .from("bu_locations")
        .select(`
          id, bu_id, name, type, status, is_default,
          parent_location_id, formatted_address,
          address_line_1, address_line_2, district,
          city, state, country, postal_code,
          latitude, longitude, google_place_id,
          timezone, notes,
          created_at, created_by, updated_at, updated_by, deleted_at,
          parent:parent_location_id(id, name)
        `)
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      return data as BuLocation;
    },
    enabled: !!locationId,
  });
}

export function useCreateBuLocation() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: BuLocationFormData & { bu_id: string }) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error("Sessão expirada. Faça login novamente para salvar a sede.");
      }

      const { data: result, error } = await supabase
        .from("bu_locations")
        .insert({
          bu_id: data.bu_id,
          name: data.name,
          type: data.type as any,
          status: data.status,
          is_default: data.is_default,
          parent_location_id: data.parent_location_id || null,
          formatted_address: data.formatted_address || null,
          address_line_1: data.address_line_1 || null,
          address_line_2: data.address_line_2 || null,
          district: data.district || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || "BR",
          postal_code: data.postal_code || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          google_place_id: data.google_place_id || null,
          timezone: data.timezone || "America/Sao_Paulo",
          notes: data.notes || null,
        })
        .select(`
          id, bu_id, name, type, status, is_default,
          parent_location_id, formatted_address,
          address_line_1, address_line_2, district,
          city, state, country, postal_code,
          latitude, longitude, google_place_id,
          timezone, notes,
          created_at, created_by, updated_at, updated_by, deleted_at,
          parent:parent_location_id(id, name)
        `)

      if (error) throw error;
      return result as BuLocation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bu.locations(variables.bu_id) });
    },
  });
}

export function useUpdateBuLocation() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ id, bu_id, ...data }: Partial<BuLocationFormData> & { id: string; bu_id: string }) => {
      const { data: result, error } = await supabase
        .from("bu_locations")
        .update({
          name: data.name,
          type: data.type as any,
          status: data.status,
          is_default: data.is_default,
          parent_location_id: data.parent_location_id,
          formatted_address: data.formatted_address,
          address_line_1: data.address_line_1,
          address_line_2: data.address_line_2,
          district: data.district,
          city: data.city,
          state: data.state,
          country: data.country,
          postal_code: data.postal_code,
          latitude: data.latitude,
          longitude: data.longitude,
          google_place_id: data.google_place_id,
          timezone: data.timezone,
          notes: data.notes,
        })
        .eq("id", id)
        .select("*, parent:parent_location_id(id, name)")
        .single();

      if (error) throw error;
      return result as BuLocation;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bu.locations(variables.bu_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bu.location(variables.id) });
    },
  });
}

export function useSoftDeleteBuLocation() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ id, bu_id }: { id: string; bu_id: string }) => {
      const { error } = await supabase
        .from("bu_locations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bu.locations(variables.bu_id) });
    },
  });
}

export function useSetDefaultBuLocation() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ id, bu_id }: { id: string; bu_id: string }) => {
      const { error } = await supabase
        .from("bu_locations")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bu.locations(variables.bu_id) });
    },
  });
}

// Helper hooks
export function useRootLocations(buId: string | null) {
  const { data: locations = [], ...rest } = useBuLocations(buId);
  const rootLocations = locations.filter(l => !l.parent_location_id);
  return { data: rootLocations, ...rest };
}

export function useChildLocations(buId: string | null, parentId: string | null) {
  const { data: locations = [], ...rest } = useBuLocations(buId);
  const childLocations = parentId 
    ? locations.filter(l => l.parent_location_id === parentId)
    : [];
  return { data: childLocations, ...rest };
}
