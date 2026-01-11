import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

export interface MigrationStatus {
  total_users: number;
  migrated_users: number;
  verified_users: number;
  not_started_users: number;
  migration_percentage: number;
}

export interface UserMigration {
  id: string;
  bu_id: string;
  user_id: string;
  status: "not_started" | "migrated" | "verified";
  v1_groups_snapshot: unknown[];
  v2_templates_applied: unknown[];
  migrated_at: string | null;
  migrated_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useBuMigrationStatus() {
  const { client: supabase, buId, isReady } = useOptionalBuClient();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: queryKeys.permissions.migrationStatus(buId),
    queryFn: async () => {
      if (!supabase || !buId) return null;

      const { data, error } = await supabase.rpc("get_bu_migration_status", {
        p_bu_id: buId,
      });

      if (error) throw error;
      
      // RPC returns an array with one row
      const row = Array.isArray(data) ? data[0] : data;
      return row as MigrationStatus | null;
    },
    enabled: isReady && !!buId,
  });

  return {
    status,
    isLoading,
    refetch,
  };
}

export function useUserMigrationStatus(userId: string | null) {
  const { client: supabase, buId, isReady } = useOptionalBuClient();

  const { data: migration, isLoading } = useQuery({
    queryKey: queryKeys.permissions.userMigration(buId, userId),
    queryFn: async () => {
      if (!supabase || !buId || !userId) return null;

      const { data, error } = await supabase
        .from("permission_migrations")
        .select("id, bu_id, user_id, status, v1_groups_snapshot, v2_templates_applied, migrated_at, migrated_by, verified_at, verified_by, notes, created_at, updated_at")
        .eq("bu_id", buId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as UserMigration | null;
    },
    enabled: isReady && !!buId && !!userId,
  });

  return {
    migration,
    isLoading,
  };
}

export function useMigrationActions() {
  const { client: supabase, buId, isReady } = useOptionalBuClient();
  const queryClient = useQueryClient();

  const markMigrated = useMutation({
    mutationFn: async ({
      userId,
      v1Snapshot,
      v2Templates,
      notes,
    }: {
      userId: string;
      v1Snapshot?: unknown[];
      v2Templates?: unknown[];
      notes?: string;
    }) => {
      if (!supabase || !buId) throw new Error("BU não selecionada");

      const { data, error } = await supabase.rpc("mark_user_migrated", {
        p_bu_id: buId,
        p_user_id: userId,
        p_v1_snapshot: JSON.stringify(v1Snapshot || []),
        p_v2_templates: JSON.stringify(v2Templates || []),
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.migrationStatus(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.userMigration(buId, null) });
      toast.success("Usuário marcado como migrado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar migração: ${error.message}`);
    },
  });

  const verifyMigration = useMutation({
    mutationFn: async ({
      userId,
      notes,
    }: {
      userId: string;
      notes?: string;
    }) => {
      if (!supabase || !buId) throw new Error("BU não selecionada");

      const { data, error } = await supabase.rpc("verify_user_migration", {
        p_bu_id: buId,
        p_user_id: userId,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.migrationStatus(buId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.userMigration(buId, null) });
      toast.success("Migração verificada");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao verificar migração: ${error.message}`);
    },
  });

  return {
    markMigrated,
    verifyMigration,
    isReady,
  };
}
