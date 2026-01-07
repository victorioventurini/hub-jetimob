import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { AgentDocument } from '../types/agentDocument';

export function useAgentDocuments(agentId: string | undefined) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: ['agent-documents', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from('ai_agent_documents')
        .select('*')
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
  const supabase = useBuScopedSupabase();
  
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
        .select()
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
      queryClient.invalidateQueries({ queryKey: ['agent-documents', variables.agentId] });
    },
  });
}

export function useDeleteAgentDocument() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
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
      queryClient.invalidateQueries({ queryKey: ['agent-documents', data.agentId] });
    },
  });
}
