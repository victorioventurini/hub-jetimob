/**
 * useAuditHistory — Generic hook for fetching audit_logs for any entity type.
 * Scalable: reuse for inventory, keyrings, phone lines, etc.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  profile_display_name: string | null;
  profile_photo_url: string | null;
}

interface UseAuditHistoryOptions {
  entityType: string;
  entityId: string | null | undefined;
  queryKey: readonly unknown[];
  limit?: number;
}

export function useAuditHistory({ entityType, entityId, queryKey, limit = 50 }: UseAuditHistoryOptions) {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<AuditEntry[]> => {
      if (!entityId) return [];

      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, old_values, new_values, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Batch-resolve user profiles
      const userIds = [...new Set(data.map((d) => d.user_id).filter(Boolean))] as string[];
      let profileMap: Record<string, { display_name: string | null; photo_url: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url")
          .in("id", userIds);

        if (profiles) {
          profileMap = Object.fromEntries(
            profiles.map((p) => [p.id, { display_name: p.display_name, photo_url: p.photo_url }])
          );
        }
      }

      return data.map((entry) => ({
        id: entry.id,
        user_id: entry.user_id,
        action: entry.action,
        old_values: entry.old_values as Record<string, unknown> | null,
        new_values: entry.new_values as Record<string, unknown> | null,
        created_at: entry.created_at,
        profile_display_name: entry.user_id ? profileMap[entry.user_id]?.display_name ?? null : null,
        profile_photo_url: entry.user_id ? profileMap[entry.user_id]?.photo_url ?? null : null,
      }));
    },
    enabled: !!entityId,
    staleTime: 30_000,
  });
}
