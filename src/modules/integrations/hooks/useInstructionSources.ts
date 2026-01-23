import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/globalClient';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import type { InstructionSourceType } from '../types';
import type { Json } from '@/integrations/supabase/types';

// ============================================================================
// Types
// ============================================================================

// Use a simpler type that matches the database response
export interface InstructionSourceRow {
  id: string;
  agent_id: string;
  source_type: string;
  name: string;
  description: string | null;
  priority: number;
  is_enabled: boolean;
  config: Json;
  last_fetch_at: string | null;
  last_fetch_status: string | null;
  last_fetch_error: string | null;
  cached_content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateInstructionSourceInput {
  agent_id: string;
  source_type: InstructionSourceType;
  name: string;
  description?: string | null;
  priority?: number;
  is_enabled?: boolean;
  config: Json;
}

interface UpdateInstructionSourceInput {
  id: string;
  name?: string;
  description?: string | null;
  priority?: number;
  is_enabled?: boolean;
  config?: Json;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all instruction sources for an agent
 */
export function useInstructionSources(agentId: string) {
  return useQuery({
    queryKey: queryKeys.integrations.instructionSources(agentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_instruction_sources')
        .select('id, agent_id, source_type, name, description, priority, is_enabled, config, last_fetch_at, last_fetch_status, last_fetch_error, cached_content, created_by, created_at, updated_at')
        .eq('agent_id', agentId)
        .order('priority', { ascending: true });

      if (error) {
        console.error('Error fetching instruction sources:', error);
        throw error;
      }

      return data as InstructionSourceRow[];
    },
    enabled: !!agentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create a new instruction source
 */
export function useCreateInstructionSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInstructionSourceInput) => {
      const { data, error } = await supabase
        .from('ai_agent_instruction_sources')
        .insert({
          agent_id: input.agent_id,
          source_type: input.source_type,
          name: input.name,
          description: input.description || null,
          priority: input.priority || 100,
          is_enabled: input.is_enabled ?? true,
          config: input.config,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating instruction source:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.instructionSources(data.agent_id),
      });
    },
    onError: (error) => {
      toast.error('Erro ao criar fonte de instrução');
      console.error('Create instruction source error:', error);
    },
  });
}

/**
 * Update an instruction source
 */
export function useUpdateInstructionSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateInstructionSourceInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('ai_agent_instruction_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating instruction source:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.instructionSources(data.agent_id),
      });
      toast.success('Fonte atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar fonte');
      console.error('Update instruction source error:', error);
    },
  });
}

/**
 * Delete an instruction source
 */
export function useDeleteInstructionSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the source to know the agent_id for invalidation
      const { data: source } = await supabase
        .from('ai_agent_instruction_sources')
        .select('agent_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('ai_agent_instruction_sources')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting instruction source:', error);
        throw error;
      }

      return { id, agentId: source?.agent_id };
    },
    onSuccess: (result) => {
      if (result.agentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.integrations.instructionSources(result.agentId),
        });
      }
      toast.success('Fonte excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir fonte');
      console.error('Delete instruction source error:', error);
    },
  });
}
