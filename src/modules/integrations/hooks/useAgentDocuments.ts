import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentDocument } from '../types/agentDocument';
import { queryKeys } from '@/lib/queryKeys';

// Uses global client since this is accessed from admin panel (/hub/integrations/...)

export function useAgentDocuments(agentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.integrations.agentDocuments(agentId ?? ''),
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from('ai_agent_documents')
        .select('id, agent_id, name, description, file_url, file_type, file_size, status, extracted_content, processing_error, created_at, updated_at, created_by')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AgentDocument[];
    },
    enabled: !!agentId,
  });
}

export function useUploadAgentDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      agentId, 
      file, 
      name, 
      description 
    }: { 
      agentId: string; 
      file: File; 
      name: string;
      description?: string;
    }) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const filePath = `${agentId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('agent-documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('agent-documents')
        .getPublicUrl(filePath);
      
      // Create document record
      const { data, error } = await supabase
        .from('ai_agent_documents')
        .insert({
          agent_id: agentId,
          name,
          description: description || null,
          file_url: filePath,
          file_type: fileExt,
          file_size: file.size,
          status: 'pending',
        })
        .select('id, agent_id, name, description, file_url, file_type, file_size, status, extracted_content, processing_error, created_at, updated_at, created_by')
        .single();
      
      if (error) throw error;
      
      // Trigger processing
      try {
        await supabase.functions.invoke('process-agent-document', {
          body: { documentId: data.id }
        });
      } catch (e) {
        console.error('Failed to trigger document processing:', e);
      }
      
      return data as AgentDocument;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.agentDocuments(variables.agentId) });
    },
  });
}

export function useDeleteAgentDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ documentId, agentId, filePath }: { documentId: string; agentId: string; filePath: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('agent-documents')
        .remove([filePath]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
      }
      
      // Delete record
      const { error } = await supabase
        .from('ai_agent_documents')
        .delete()
        .eq('id', documentId);
      
      if (error) throw error;
      
      return { documentId, agentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.agentDocuments(data.agentId) });
    },
  });
}
