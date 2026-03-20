/**
 * usePhoneLineHistory — Fetches audit_logs for a specific phone line.
 * Reuses the generic audit_logs table with entity_type = 'asset_phone_line'.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assetsKeys } from "@/lib/queryKeys/assets";

export interface PhoneLineAuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  /** Resolved from profiles join */
  profile_display_name: string | null;
  profile_photo_url: string | null;
}

export function usePhoneLineHistory(phoneLineId: string | null | undefined) {
  return useQuery({
    queryKey: assetsKeys.phoneLines.history(phoneLineId ?? ""),
    queryFn: async (): Promise<PhoneLineAuditEntry[]> => {
      if (!phoneLineId) return [];

      // audit_logs doesn't have RLS based on bu_id, it uses user_id from auth
      // We query via the service-level anon client (audit_logs has select policy for authenticated)
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, old_values, new_values, created_at")
        .eq("entity_type", "asset_phone_line")
        .eq("entity_id", phoneLineId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Resolve user names in a single batch
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
    enabled: !!phoneLineId,
    staleTime: 30_000,
  });
}
