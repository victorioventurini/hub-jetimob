import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

// Types
export interface PermissionTemplateV2 {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  surface: 'view' | 'operate' | 'administer' | 'base' | 'restricted' | null;
  module: string | null;
  is_system: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PermissionTemplateItemV2 {
  template_id: string;
  permission_key: string;
  created_at: string;
}

export interface BuUserTemplateV2 {
  id: string;
  bu_id: string;
  user_id: string;
  template_id: string;
  created_at: string;
  created_by: string | null;
  permission_templates_v2?: PermissionTemplateV2;
}

export interface EffectivePermission {
  permission_key: string;
  source: 'template_v2' | 'override' | 'wildcard';
  source_name: string;
}

// Hook: Templates V2
export function usePermissionTemplatesV2() {
  const queryClient = useQueryClient();
  const { client: supabase, isReady } = useOptionalBuClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: queryKeys.permissions.templatesV2(),
    queryFn: async () => {
      if (!supabase) throw new Error("No client available");
      
      const { data, error } = await supabase
        .from("permission_templates_v2")
        .select("id, slug, name, description, surface, module, is_system, version, created_at, updated_at")
        .order("module", { nullsFirst: true })
        .order("surface")
        .order("name");

      if (error) throw error;
      return data as PermissionTemplateV2[];
    },
    enabled: isReady,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: { slug: string; name: string; description?: string; surface?: string; module?: string }) => {
      if (!supabase) throw new Error("No client available");
      
      const { data, error } = await supabase
        .from("permission_templates_v2")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.templatesV2() });
      toast.success("Template v2 criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PermissionTemplateV2> & { id: string }) => {
      if (!supabase) throw new Error("No client available");
      
      const { data, error } = await supabase
        .from("permission_templates_v2")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.templatesV2() });
      toast.success("Template v2 atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`);
    },
  });

  // Group templates by surface for display
  const templatesBySurface = templates.reduce(
    (acc, t) => {
      const key = t.surface || 'other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {} as Record<string, PermissionTemplateV2[]>
  );

  // Group templates by module
  const templatesByModule = templates.reduce(
    (acc, t) => {
      const key = t.module || 'global';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {} as Record<string, PermissionTemplateV2[]>
  );

  return {
    templates,
    templatesBySurface,
    templatesByModule,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
  };
}

// Hook: Template Items V2
export function useTemplateItemsV2(templateId: string | null) {
  const queryClient = useQueryClient();
  const { client: supabase, isReady } = useOptionalBuClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.permissions.templateItemsV2(templateId),
    queryFn: async () => {
      if (!supabase || !templateId) return [];
      
      const { data, error } = await supabase
        .from("permission_template_items_v2")
        .select("template_id, permission_key, created_at")
        .eq("template_id", templateId)
        .order("permission_key");

      if (error) throw error;
      return data as PermissionTemplateItemV2[];
    },
    enabled: isReady && !!templateId,
  });

  const setTemplateItems = useMutation({
    mutationFn: async ({ templateId, keys }: { templateId: string; keys: string[] }) => {
      if (!supabase) throw new Error("No client available");
      
      // Delete existing
      const { error: deleteError } = await supabase
        .from("permission_template_items_v2")
        .delete()
        .eq("template_id", templateId);

      if (deleteError) throw deleteError;

      // Insert new
      if (keys.length > 0) {
        const { error: insertError } = await supabase
          .from("permission_template_items_v2")
          .insert(keys.map(key => ({ template_id: templateId, permission_key: key })));

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.templateItemsV2(templateId) });
      toast.success("Permissões do template atualizadas");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar permissões: ${error.message}`);
    },
  });

  return {
    items,
    keys: items.map(i => i.permission_key),
    isLoading,
    setTemplateItems,
  };
}

// Hook: User Templates V2 (BU-scoped assignments)
export function useUserTemplatesV2(userId: string | null) {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const { buId } = useOptionalBuClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: queryKeys.permissions.userTemplatesV2(buId, userId),
    queryFn: async () => {
      if (!userId || !buId) return [];
      
      const { data, error } = await supabase
        .from("bu_user_permission_templates_v2")
        .select("id, bu_id, user_id, template_id, created_at, permission_templates_v2(id, slug, name, description, surface, module)")
        .eq("user_id", userId)
        .eq("bu_id", buId);

      if (error) throw error;
      return data as BuUserTemplateV2[];
    },
    enabled: !!userId && !!buId,
  });

  const assignTemplate = useMutation({
    mutationFn: async ({ userId, templateId }: { userId: string; templateId: string }) => {
      if (!buId) throw new Error("No BU selected");
      
      const { data, error } = await supabase
        .from("bu_user_permission_templates_v2")
        .insert({ bu_id: buId, user_id: userId, template_id: templateId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.userTemplatesV2(buId, userId) });
      toast.success("Template v2 atribuído");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir template: ${error.message}`);
    },
  });

  const removeTemplate = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("bu_user_permission_templates_v2")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.userTemplatesV2(buId, userId) });
      toast.success("Template v2 removido");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover template: ${error.message}`);
    },
  });

  return {
    assignments,
    templates: assignments.map(a => a.permission_templates_v2).filter(Boolean) as PermissionTemplateV2[],
    isLoading,
    assignTemplate,
    removeTemplate,
  };
}

// Hook: Effective Permissions V2 Only
export function useEffectivePermissionsV2(userId: string | null) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: queryKeys.permissions.effectivePreview(buId, userId, 'v2'),
    queryFn: async () => {
      if (!supabase || !buId || !userId) return [];
      
      // Cast to bypass strict typing for RPC
      const { data, error } = await (supabase as unknown as { 
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }> 
      }).rpc("get_effective_permissions_v2", {
        p_user_id: userId,
        p_bu_id: buId,
      });

      if (error) throw error;
      return (data || []) as EffectivePermission[];
    },
    enabled: isReady && !!buId && !!userId,
  });

  // Group by source for display
  const bySource = permissions.reduce(
    (acc, p) => {
      if (!acc[p.source]) acc[p.source] = [];
      acc[p.source].push(p);
      return acc;
    },
    {} as Record<string, EffectivePermission[]>
  );

  // Unique keys
  const uniqueKeys = [...new Set(permissions.map(p => p.permission_key))].sort();

  return {
    permissions,
    bySource,
    uniqueKeys,
    count: uniqueKeys.length,
    isLoading,
  };
}
