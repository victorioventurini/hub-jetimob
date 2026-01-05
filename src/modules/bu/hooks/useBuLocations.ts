import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BuLocation, BuLocationFormData } from "../types/location";

export function useBuLocations(buId: string | null) {
  return useQuery({
    queryKey: ["bu-locations", buId],
    queryFn: async () => {
      if (!buId) return [];
      
      const { data, error } = await supabase
        .from("bu_locations")
        .select("*")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as BuLocation[];
    },
    enabled: !!buId,
  });
}

export function useBuLocation(locationId: string | null) {
  return useQuery({
    queryKey: ["bu-location", locationId],
    queryFn: async () => {
      if (!locationId) return null;
      
      const { data, error } = await supabase
        .from("bu_locations")
        .select("*")
        .eq("id", locationId)
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

  return useMutation({
    mutationFn: async (data: BuLocationFormData & { bu_id: string }) => {
      const { data: result, error } = await supabase
        .from("bu_locations")
        .insert({
          bu_id: data.bu_id,
          name: data.name,
          type: data.type,
          status: data.status,
          is_default: data.is_default,
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
        .select()
        .single();

      if (error) throw error;
      return result as BuLocation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bu-locations", variables.bu_id] });
    },
  });
}

export function useUpdateBuLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bu_id, ...data }: Partial<BuLocationFormData> & { id: string; bu_id: string }) => {
      const { data: result, error } = await supabase
        .from("bu_locations")
        .update({
          name: data.name,
          type: data.type,
          status: data.status,
          is_default: data.is_default,
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
        .select()
        .single();

      if (error) throw error;
      return result as BuLocation;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bu-locations", variables.bu_id] });
      queryClient.invalidateQueries({ queryKey: ["bu-location", variables.id] });
    },
  });
}

export function useSoftDeleteBuLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bu_id }: { id: string; bu_id: string }) => {
      const { error } = await supabase
        .from("bu_locations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bu-locations", variables.bu_id] });
    },
  });
}

export function useSetDefaultBuLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bu_id }: { id: string; bu_id: string }) => {
      const { error } = await supabase
        .from("bu_locations")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bu-locations", variables.bu_id] });
    },
  });
}
