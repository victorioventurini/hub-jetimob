import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { toast } from 'sonner';
import type { 
  IntegrationCatalogItem, 
  IntegrationGlobalConfig, 
  BuIntegrationConfig,
  AiAgent,
  AiAgentLog
} from '../types';
import type { Json } from '@/integrations/supabase/types';

// ============================================
// CATALOG HOOKS
// ============================================

export function useIntegrationsCatalog() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['integrations-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_integrations_catalog')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as IntegrationCatalogItem[];
    },
  });
}

export function useIntegrationByKey(integrationKey: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['integration-catalog', integrationKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_integrations_catalog')
        .select('*')
        .eq('integration_key', integrationKey)
        .single();
      
      if (error) throw error;
      return data as IntegrationCatalogItem;
    },
    enabled: !!integrationKey,
  });
}

// ============================================
// GLOBAL CONFIG HOOKS
// ============================================

export function useGlobalConfigs() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['integrations-global-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_integrations_global_config')
        .select('*');
      
      if (error) throw error;
      return data as IntegrationGlobalConfig[];
    },
  });
}

export function useGlobalConfig(integrationKey: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['integration-global-config', integrationKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_integrations_global_config')
        .select('*')
        .eq('integration_key', integrationKey)
        .maybeSingle();
      
      if (error) throw error;
      return data as IntegrationGlobalConfig | null;
    },
    enabled: !!integrationKey,
  });
}

export function useUpsertGlobalConfig() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async (config: {
      integration_key: string;
      is_enabled_global: boolean;
      config_encrypted: Record<string, unknown>;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Check if config exists
      const { data: existing } = await supabase
        .from('hub_integrations_global_config')
        .select('id')
        .eq('integration_key', config.integration_key)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('hub_integrations_global_config')
          .update({
            is_enabled_global: config.is_enabled_global,
            config_encrypted: config.config_encrypted as Json,
            updated_by: user.user?.id,
          })
          .eq('integration_key', config.integration_key);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hub_integrations_global_config')
          .insert({
            integration_key: config.integration_key,
            is_enabled_global: config.is_enabled_global,
            config_encrypted: config.config_encrypted as Json,
            updated_by: user.user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations-global-configs'] });
      queryClient.invalidateQueries({ queryKey: ['integration-global-config', variables.integration_key] });
      toast.success('Configuração global salva!');
    },
    onError: (error) => {
      console.error('Error saving global config:', error);
      toast.error('Erro ao salvar configuração.');
    },
  });
}

export function useUpdateGlobalTestStatus() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async (data: {
      integration_key: string;
      last_test_status: 'ok' | 'error' | 'pending';
      last_test_message?: string;
    }) => {
      const { error } = await supabase
        .from('hub_integrations_global_config')
        .update({
          last_test_status: data.last_test_status,
          last_test_message: data.last_test_message || null,
          last_test_at: new Date().toISOString(),
        })
        .eq('integration_key', data.integration_key);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-global-config', variables.integration_key] });
    },
  });
}

// ============================================
// BU CONFIG HOOKS
// ============================================

export function useBuIntegrationConfigs(buId: string | undefined) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['bu-integration-configs', buId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bu_integrations_config')
        .select('*')
        .eq('bu_id', buId!);
      
      if (error) throw error;
      return data as BuIntegrationConfig[];
    },
    enabled: !!buId,
  });
}

export function useBuIntegrationConfig(buId: string | undefined, integrationKey: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['bu-integration-config', buId, integrationKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bu_integrations_config')
        .select('*')
        .eq('bu_id', buId!)
        .eq('integration_key', integrationKey)
        .maybeSingle();
      
      if (error) throw error;
      return data as BuIntegrationConfig | null;
    },
    enabled: !!buId && !!integrationKey,
  });
}

export function useUpsertBuIntegrationConfig() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async (config: {
      bu_id: string;
      integration_key: string;
      is_enabled_in_bu: boolean;
      config_mode: 'use_global' | 'override';
      config_override_encrypted?: Record<string, unknown> | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Check if config exists
      const { data: existing } = await supabase
        .from('bu_integrations_config')
        .select('id')
        .eq('bu_id', config.bu_id)
        .eq('integration_key', config.integration_key)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('bu_integrations_config')
          .update({
            is_enabled_in_bu: config.is_enabled_in_bu,
            config_mode: config.config_mode,
            config_override_encrypted: (config.config_override_encrypted || null) as Json,
            updated_by: user.user?.id,
          })
          .eq('bu_id', config.bu_id)
          .eq('integration_key', config.integration_key);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bu_integrations_config')
          .insert({
            bu_id: config.bu_id,
            integration_key: config.integration_key,
            is_enabled_in_bu: config.is_enabled_in_bu,
            config_mode: config.config_mode,
            config_override_encrypted: (config.config_override_encrypted || null) as Json,
            updated_by: user.user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bu-integration-configs', variables.bu_id] });
      queryClient.invalidateQueries({ queryKey: ['bu-integration-config', variables.bu_id, variables.integration_key] });
      toast.success('Configuração da BU salva!');
    },
    onError: (error) => {
      console.error('Error saving BU config:', error);
      toast.error('Erro ao salvar configuração.');
    },
  });
}

// ============================================
// AGENT HOOKS
// ============================================

export function useGlobalAgents(integrationKey?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['global-agents', integrationKey],
    queryFn: async () => {
      let query = supabase
        .from('ai_agents')
        .select('*')
        .eq('scope', 'global')
        .order('name');
      
      if (integrationKey) {
        query = query.eq('integration_key', integrationKey);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AiAgent[];
    },
  });
}

export function useBuAgents(buId: string | undefined, integrationKey?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['bu-agents', buId, integrationKey],
    queryFn: async () => {
      let query = supabase
        .from('ai_agents')
        .select('*')
        .eq('scope', 'bu')
        .eq('bu_id', buId!)
        .order('name');
      
      if (integrationKey) {
        query = query.eq('integration_key', integrationKey);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AiAgent[];
    },
    enabled: !!buId,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async (agent: {
      scope: 'global' | 'bu';
      bu_id?: string | null;
      integration_key: string;
      name: string;
      description?: string | null;
      is_active?: boolean;
      system_prompt: string;
      output_format?: 'text' | 'json';
      output_schema?: Record<string, unknown> | null;
      allowed_tools?: Json;
      model_name?: string | null;
      max_tokens?: number | null;
      temperature?: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ai_agents')
        .insert({
          scope: agent.scope,
          bu_id: agent.bu_id || null,
          integration_key: agent.integration_key,
          name: agent.name,
          description: agent.description || null,
          is_active: agent.is_active ?? true,
          system_prompt: agent.system_prompt,
          output_format: agent.output_format || 'text',
          output_schema: (agent.output_schema || null) as Json,
          allowed_tools: agent.allowed_tools || [],
          model_name: agent.model_name || null,
          max_tokens: agent.max_tokens || null,
          temperature: agent.temperature ?? 0.7,
          created_by: user.user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['global-agents'] });
      if (variables.bu_id) {
        queryClient.invalidateQueries({ queryKey: ['bu-agents', variables.bu_id] });
      }
      toast.success('Agente criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating agent:', error);
      toast.error('Erro ao criar agente.');
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string;
      name?: string;
      description?: string | null;
      is_active?: boolean;
      system_prompt?: string;
      output_format?: 'text' | 'json';
      output_schema?: Record<string, unknown> | null;
      allowed_tools?: Json;
      model_name?: string | null;
      max_tokens?: number | null;
      temperature?: number;
    }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.system_prompt !== undefined) updateData.system_prompt = updates.system_prompt;
      if (updates.output_format !== undefined) updateData.output_format = updates.output_format;
      if (updates.output_schema !== undefined) updateData.output_schema = updates.output_schema as Json;
      if (updates.allowed_tools !== undefined) updateData.allowed_tools = updates.allowed_tools;
      if (updates.model_name !== undefined) updateData.model_name = updates.model_name;
      if (updates.max_tokens !== undefined) updateData.max_tokens = updates.max_tokens;
      if (updates.temperature !== undefined) updateData.temperature = updates.temperature;
      
      const { error } = await supabase
        .from('ai_agents')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-agents'] });
      queryClient.invalidateQueries({ queryKey: ['bu-agents'] });
      toast.success('Agente atualizado!');
    },
    onError: (error) => {
      console.error('Error updating agent:', error);
      toast.error('Erro ao atualizar agente.');
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-agents'] });
      queryClient.invalidateQueries({ queryKey: ['bu-agents'] });
      toast.success('Agente removido!');
    },
    onError: (error) => {
      console.error('Error deleting agent:', error);
      toast.error('Erro ao remover agente.');
    },
  });
}

// ============================================
// AGENT LOGS HOOKS
// ============================================

export function useAgentLogs(filters?: { 
  bu_id?: string; 
  agent_id?: string;
  integration_key?: string;
  limit?: number;
}) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['agent-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('ai_agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);
      
      if (filters?.bu_id) {
        query = query.eq('bu_id', filters.bu_id);
      }
      if (filters?.agent_id) {
        query = query.eq('agent_id', filters.agent_id);
      }
      if (filters?.integration_key) {
        query = query.eq('integration_key', filters.integration_key);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AiAgentLog[];
    },
  });
}
