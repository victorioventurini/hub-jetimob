/**
 * Notification Templates Hooks
 * Phase 5: Template management with versioning and rollback
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { supabase as globalSupabase } from '@/integrations/supabase/globalClient';

// Types
export interface NotificationTemplate {
  id: string;
  event_slug: string;
  channel: string;
  subject_template: string | null;
  body_template: string;
  version: number;
  is_active: boolean;
  bu_id: string | null;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  subject: string | null;
  body: string;
  variables_used: string[];
  created_by: string | null;
  created_at: string;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  // Joined
  creator?: { display_name: string | null };
}

export interface TemplateVariable {
  id: string;
  event_slug: string;
  variable_key: string;
  variable_label: string;
  variable_type: string;
  example_value: string | null;
  is_required: boolean;
  description: string | null;
}

export interface TemplateAuditLog {
  id: string;
  template_id: string;
  version_id: string | null;
  action: 'create' | 'update' | 'activate' | 'deactivate' | 'rollback';
  actor_id: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
  // Joined
  actor?: { display_name: string | null };
}

export interface TemplateFilters {
  channel?: string;
  eventSlug?: string;
  q?: string;
}

// ==========================================
// Hook: Lista de Templates
// ==========================================
export function useNotificationTemplates(buId?: string, filters?: TemplateFilters) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.templates.list(buId ?? null, filters),
    queryFn: async () => {
      if (!buId) return [];
      
      // Get BU-specific templates + global templates
      let query = supabase
        .from('notification_templates')
        .select(`
          id, event_slug, channel, subject_template, body_template,
          version, is_active, bu_id, current_version_id, created_at, updated_at
        `)
        .or(`bu_id.eq.${buId},bu_id.is.null`)
        .order('event_slug')
        .order('channel');
      
      if (filters?.channel && filters.channel !== 'all') {
        query = query.eq('channel', filters.channel);
      }
      if (filters?.eventSlug && filters.eventSlug !== 'all') {
        query = query.eq('event_slug', filters.eventSlug);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter by search if provided
      let templates = data as NotificationTemplate[];
      if (filters?.q) {
        const search = filters.q.toLowerCase();
        templates = templates.filter(t => 
          t.event_slug.toLowerCase().includes(search) ||
          t.subject_template?.toLowerCase().includes(search) ||
          t.body_template?.toLowerCase().includes(search)
        );
      }
      
      return templates;
    },
    enabled: !!buId,
  });
}

// ==========================================
// Hook: Versões de um Template
// ==========================================
export function useNotificationTemplateVersions(templateId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.templates.versions(templateId ?? ''),
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from('notification_template_versions')
        .select(`
          id, template_id, version, subject, body, variables_used,
          created_by, created_at, is_approved, approved_by, approved_at
        `)
        .eq('template_id', templateId)
        .order('version', { ascending: false });
      
      if (error) throw error;
      return data as TemplateVersion[];
    },
    enabled: !!templateId,
  });
}

// ==========================================
// Hook: Variáveis disponíveis por evento
// ==========================================
export function useNotificationTemplateVariables(eventSlug?: string | null) {
  return useQuery({
    queryKey: queryKeys.notifications.templates.variables(eventSlug ?? null),
    queryFn: async () => {
      if (!eventSlug) return [];
      
      // Global variables (apply to all events)
      const { data: globalVars, error: globalError } = await globalSupabase
        .from('notification_template_variables')
        .select(`
          id, event_slug, variable_key, variable_label, variable_type,
          example_value, is_required, description
        `)
        .or(`event_slug.eq.${eventSlug},event_slug.eq.__global__`)
        .order('is_required', { ascending: false })
        .order('variable_key');
      
      if (globalError) throw globalError;
      return globalVars as TemplateVariable[];
    },
    enabled: !!eventSlug,
  });
}

// ==========================================
// Hook: Audit Log de um Template
// ==========================================
export function useNotificationTemplateAudit(templateId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.templates.audit(templateId ?? ''),
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from('notification_template_audit_log')
        .select(`
          id, template_id, version_id, action, actor_id, changes, created_at
        `)
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as TemplateAuditLog[];
    },
    enabled: !!templateId,
  });
}

// ==========================================
// Mutation: Salvar nova versão
// ==========================================
export function useSaveTemplateVersion() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      subject,
      body,
      reason,
    }: {
      templateId: string;
      subject: string | null;
      body: string;
      reason?: string;
    }) => {
      const { data, error } = await globalSupabase
        .rpc('create_template_version', {
          p_template_id: templateId,
          p_subject: subject,
          p_body: body,
          p_reason: reason,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.templates.list(currentBu?.id ?? null) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.templates.versions(variables.templateId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.templates.audit(variables.templateId) 
      });
    },
  });
}

// ==========================================
// Mutation: Ativar versão (rollback)
// ==========================================
export function useActivateTemplateVersion() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      versionId,
      reason,
    }: {
      templateId: string;
      versionId: string;
      reason?: string;
    }) => {
      const { data, error } = await globalSupabase
        .rpc('activate_template_version', {
          p_template_id: templateId,
          p_version_id: versionId,
          p_reason: reason,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.templates.list(currentBu?.id ?? null) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.templates.versions(variables.templateId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.templates.audit(variables.templateId) 
      });
    },
  });
}

// ==========================================
// Mutation: Criar template para BU
// ==========================================
export function useCreateBuTemplate() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      eventSlug,
      channel,
      subject,
      body,
      reason,
    }: {
      eventSlug: string;
      channel: string;
      subject: string | null;
      body: string;
      reason?: string;
    }) => {
      if (!currentBu?.id) throw new Error('BU não disponível');
      
      const { data, error } = await globalSupabase
        .rpc('create_bu_template', {
          p_bu_id: currentBu.id,
          p_event_slug: eventSlug,
          p_channel: channel,
          p_subject: subject,
          p_body: body,
          p_reason: reason || 'Criação inicial',
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.templates.list(currentBu?.id ?? null) 
      });
    },
  });
}

// ==========================================
// Utility: Validar variáveis client-side
// ==========================================
export function extractTemplateVariables(text: string): string[] {
  const regex = /\{\{([a-z_]+)\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
}

export function validateTemplateVariables(
  body: string,
  subject: string | null,
  allowedVariables: TemplateVariable[]
): { valid: boolean; invalidVariables: string[] } {
  const usedVars = extractTemplateVariables(
    (body || '') + ' ' + (subject || '')
  );
  
  const allowedKeys = allowedVariables.map(v => v.variable_key);
  const invalidVariables = usedVars.filter(v => !allowedKeys.includes(v));
  
  return {
    valid: invalidVariables.length === 0,
    invalidVariables,
  };
}
