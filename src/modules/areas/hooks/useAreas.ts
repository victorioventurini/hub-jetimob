/**
 * Areas hooks - CRUD operations for strategic areas
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { AreaWithRelations, AreaFormData } from "../types";
import { toast } from "sonner";

// Explicit fields - avoid select('*')
const AREA_FIELDS = `
  id, bu_id, name, description, status, color, icon,
  leader_user_id, co_leader_user_id,
  created_at, updated_at, deleted_at
`;

export interface UseAreasOptions {
  includeInactive?: boolean;
  search?: string;
}

export function useAreas(options: UseAreasOptions = {}) {
  const { includeInactive = false, search } = options;
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.areas.list(buId ?? null, includeInactive),
    queryFn: async () => {
      if (!supabase || !buId) return [];

      let query = supabase
        .from("areas")
        .select(`
          ${AREA_FIELDS},
          leader:profiles!areas_leader_user_id_fkey(id, display_name, photo_url),
          co_leader:profiles!areas_co_leader_user_id_fkey(id, display_name, photo_url)
        `)
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .order("name");

      if (!includeInactive) {
        query = query.eq("status", "active");
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.ilike("name", term);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get team counts per area
      const areaIds = (data || []).map((a: any) => a.id);
      
      const { data: teamCounts } = await supabase
        .from("teams")
        .select("area_id")
        .in("area_id", areaIds)
        .is("deleted_at", null)
        .eq("status", "active");

      const countMap = new Map<string, number>();
      teamCounts?.forEach((t) => {
        if (t.area_id) {
          countMap.set(t.area_id, (countMap.get(t.area_id) || 0) + 1);
        }
      });

      return (data || []).map((area: any) => ({
        ...area,
        team_count: countMap.get(area.id) || 0,
      })) as AreaWithRelations[];
    },
    enabled: isReady && !!buId && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useArea(areaId: string | undefined) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.areas.detail(areaId),
    queryFn: async () => {
      if (!areaId) return null;

      const { data, error } = await supabase
        .from("areas")
        .select(`
          ${AREA_FIELDS},
          leader:profiles!areas_leader_user_id_fkey(id, display_name, photo_url),
          co_leader:profiles!areas_co_leader_user_id_fkey(id, display_name, photo_url)
        `)
        .eq("id", areaId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get teams in this area
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, status, member_count")
        .eq("area_id", areaId)
        .is("deleted_at", null)
        .order("name");

      return {
        ...data,
        teams: teams || [],
        team_count: teams?.length || 0,
      } as AreaWithRelations;
    },
    enabled: !!areaId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (data: AreaFormData) => {
      if (!currentBu?.id) {
        throw new Error("Nenhuma BU selecionada");
      }

      const { data: area, error } = await supabase
        .from("areas")
        .insert({
          name: data.name,
          description: data.description || null,
          leader_user_id: data.leader_user_id || null,
          co_leader_user_id: data.co_leader_user_id || null,
          status: data.status,
          color: data.color || null,
          icon: data.icon || null,
          bu_id: currentBu.id,
        })
        .select()
        .single();

      if (error) throw error;
      return area;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.list(currentBu?.id ?? null, false) });
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.list(currentBu?.id ?? null, true) });
      toast.success("Área criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar área");
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AreaFormData>;
    }) => {
      // Sanitize UUID fields: convert empty strings to null
      const sanitizedData = {
        ...data,
        ...(data.leader_user_id !== undefined && {
          leader_user_id: data.leader_user_id || null,
        }),
        ...(data.co_leader_user_id !== undefined && {
          co_leader_user_id: data.co_leader_user_id || null,
        }),
        updated_at: new Date().toISOString(),
      };

      const { data: area, error } = await supabase
        .from("areas")
        .update(sanitizedData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return area;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.list(null, false), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.list(null, true), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.detail(variables.id) });
      toast.success("Área atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar área");
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useMutation({
    mutationFn: async (areaId: string) => {
      // Soft delete
      const { error } = await supabase
        .from("areas")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", areaId);

      if (error) throw error;
      return areaId;
    },
    onMutate: async (areaId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.areas.list(buId, false) });
      await queryClient.cancelQueries({ queryKey: queryKeys.areas.list(buId, true) });

      const activeKey = queryKeys.areas.list(buId, false);
      const inactiveKey = queryKeys.areas.list(buId, true);

      const previousActive = queryClient.getQueryData<AreaWithRelations[]>(activeKey);
      const previousInactive = queryClient.getQueryData<AreaWithRelations[]>(inactiveKey);

      if (previousActive) {
        queryClient.setQueryData(activeKey, previousActive.filter((a) => a.id !== areaId));
      }
      if (previousInactive) {
        queryClient.setQueryData(inactiveKey, previousInactive.filter((a) => a.id !== areaId));
      }

      return { previousActive, previousInactive, activeKey, inactiveKey };
    },
    onError: (_error, _areaId, context) => {
      if (context?.previousActive) {
        queryClient.setQueryData(context.activeKey, context.previousActive);
      }
      if (context?.previousInactive) {
        queryClient.setQueryData(context.inactiveKey, context.previousInactive);
      }
      toast.error("Erro ao excluir área");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.list(buId, false) });
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.list(buId, true) });
      toast.success("Área excluída com sucesso");
    },
  });
}
