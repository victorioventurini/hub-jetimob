import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

// ============================================
// Types
// ============================================

export interface PermissionPreset {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  module: string | null;
  surface: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionPresetItem {
  id: string;
  preset_id: string;
  template_id: string;
  created_at: string;
}

export interface PermissionDiff {
  permission_key: string;
  change_type: "add" | "remove";
  source_name: string;
}

export interface PermissionExplanation {
  source_type: "template" | "override";
  source_id: string;
  source_name: string;
  granted_at: string;
  granted_by: string | null;
  granted_by_name: string;
  is_auto_assigned: boolean;
}

export interface PermissionRiskReport {
  user_id: string;
  bu_id: string;
  user_name: string;
  user_email: string;
  template_count: number;
  permission_count: number;
  risk_level: "low" | "medium" | "high";
  risk_reasons: string[];
}

export interface PermissionAuditLog {
  id: string;
  bu_id: string;
  target_user_id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  before_state: unknown;
  after_state: unknown;
  reason: string;
  created_at: string;
}

// ============================================
// Query Keys Extension
// ============================================

export const governanceQueryKeys = {
  presets: () => ["permissions", "presets"] as const,
  presetItems: (presetId: string | null) => ["permissions", "presets", presetId, "items"] as const,
  diff: (userId: string, templateIds: string[]) => ["permissions", "diff", userId, templateIds] as const,
  explanation: (userId: string, key: string) => ["permissions", "explanation", userId, key] as const,
  riskReport: (buId: string | null) => ["permissions", "risk-report", buId] as const,
  auditLogs: (buId: string | null) => ["permissions", "audit-logs", buId] as const,
  usersWithoutTemplates: (buId: string | null) => ["permissions", "users-without-templates", buId] as const,
};

// ============================================
// Hooks
// ============================================

/**
 * Hook for managing permission presets
 */
export function usePermissionPresets() {
  const queryClient = useQueryClient();
  const { client: supabase, isReady } = useOptionalBuClient();

  const { data: presets = [], isLoading } = useQuery({
    queryKey: governanceQueryKeys.presets(),
    staleTime: 10 * 60 * 1000, // 10 minutes - presets change rarely
    queryFn: async () => {
      if (!supabase) throw new Error("No client available");

      const { data, error } = await supabase
        .from("permission_presets")
        .select("id, slug, name, description, module, surface, icon, sort_order, is_active, created_at")
        .eq("is_active", true)
        .order("module")
        .order("sort_order");

      if (error) throw error;
      return data as PermissionPreset[];
    },
    enabled: isReady,
  });

  // Group by module
  const presetsByModule = presets.reduce(
    (acc, p) => {
      const key = p.module || "global";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {} as Record<string, PermissionPreset[]>
  );

  return {
    presets,
    presetsByModule,
    isLoading,
  };
}

/**
 * Hook for preset items (templates in a preset)
 * NOTE: permission_preset_items table was removed. This hook now returns empty data.
 * Presets system needs redesign - templates are linked directly via permission_presets.template_ids array.
 */
export function usePresetItems(presetId: string | null) {
  // Table was dropped - return empty structure
  return {
    items: [] as Array<{ id: string; preset_id: string; template_id: string; created_at: string }>,
    templateIds: [] as string[],
    isLoading: false,
  };
}

/**
 * Hook for getting permission diff before applying changes
 */
export function usePermissionDiff(userId: string | null, newTemplateIds: string[]) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  const { data: diff = [], isLoading, refetch } = useQuery({
    queryKey: governanceQueryKeys.diff(userId || "", newTemplateIds),
    staleTime: 30 * 1000, // 30 seconds - diff is calculated on-demand
    queryFn: async () => {
      if (!supabase || !buId || !userId || newTemplateIds.length === 0) return [];

      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
      }).rpc("get_permission_diff", {
        p_user_id: userId,
        p_bu_id: buId,
        p_new_template_ids: newTemplateIds,
      });

      if (error) throw error;
      return (data || []) as PermissionDiff[];
    },
    enabled: isReady && !!buId && !!userId && newTemplateIds.length > 0,
  });

  const additions = diff.filter((d) => d.change_type === "add");
  const removals = diff.filter((d) => d.change_type === "remove");

  return {
    diff,
    additions,
    removals,
    hasChanges: diff.length > 0,
    isLoading,
    refetch,
  };
}

/**
 * Hook for explaining why a user has a specific permission
 */
export function usePermissionExplanation(userId: string | null, permissionKey: string | null) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  const { data: explanations = [], isLoading } = useQuery({
    queryKey: governanceQueryKeys.explanation(userId || "", permissionKey || ""),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!supabase || !buId || !userId || !permissionKey) return [];

      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
      }).rpc("explain_permission", {
        p_user_id: userId,
        p_bu_id: buId,
        p_permission_key: permissionKey,
      });

      if (error) throw error;
      return (data || []) as PermissionExplanation[];
    },
    enabled: isReady && !!buId && !!userId && !!permissionKey,
  });

  return {
    explanations,
    isLoading,
  };
}

/**
 * Hook for permission risk report
 */
export function usePermissionRiskReport() {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: governanceQueryKeys.riskReport(buId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!supabase || !buId) return [];

      const { data, error } = await supabase
        .from("v_permission_risk_report")
        .select("user_id, bu_id, user_name, user_email, template_count, permission_count, risk_level, risk_reasons")
        .eq("bu_id", buId)
        .order("risk_level", { ascending: false });

      if (error) throw error;
      return data as PermissionRiskReport[];
    },
    enabled: isReady && !!buId,
  });

  const highRisk = reports.filter((r) => r.risk_level === "high");
  const mediumRisk = reports.filter((r) => r.risk_level === "medium");

  return {
    reports,
    highRisk,
    mediumRisk,
    totalAtRisk: reports.length,
    isLoading,
  };
}

/**
 * Hook for permission audit logs
 */
export function usePermissionAuditLogs(limit = 50) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: governanceQueryKeys.auditLogs(buId),
    staleTime: 2 * 60 * 1000, // 2 minutes - audit logs may update frequently
    queryFn: async () => {
      if (!supabase || !buId) return [];

      const { data, error } = await supabase
        .from("permission_audit_log")
        .select("id, bu_id, target_user_id, actor_id, action, entity_type, entity_id, entity_name, before_state, after_state, reason, created_at")
        .eq("bu_id", buId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PermissionAuditLog[];
    },
    enabled: isReady && !!buId,
  });

  return {
    logs,
    isLoading,
  };
}

/**
 * Hook for logging permission changes
 */
export function useLogPermissionChange() {
  const supabase = useBuScopedSupabase();
  const { buId } = useOptionalBuClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      targetUserId: string;
      action: "assign_template" | "remove_template" | "apply_preset" | "add_override" | "remove_override";
      entityType: "template" | "preset" | "override";
      entityId?: string;
      entityName?: string;
      beforeState?: unknown;
      afterState?: unknown;
      reason: string;
    }) => {
      if (!buId) throw new Error("No BU selected");

      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
      }).rpc("log_permission_change", {
        p_bu_id: buId,
        p_target_user_id: params.targetUserId,
        p_action: params.action,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId || null,
        p_entity_name: params.entityName || null,
        p_before_state: params.beforeState || null,
        p_after_state: params.afterState || null,
        p_reason: params.reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: governanceQueryKeys.auditLogs(buId), refetchType: 'active' });
    },
  });
}

/**
 * Hook for users without templates (guardrail)
 */
export function useUsersWithoutTemplates() {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: governanceQueryKeys.usersWithoutTemplates(buId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!supabase || !buId) return [];

      const { data, error } = await supabase
        .from("v_users_without_templates")
        .select("profile_id, bu_id, display_name, work_email, role_in_bu, membership_created_at")
        .eq("bu_id", buId);

      if (error) throw error;
      return data;
    },
    enabled: isReady && !!buId,
  });

  return {
    users,
    count: users.length,
    isLoading,
  };
}
