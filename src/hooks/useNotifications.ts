import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useAuth } from './useAuth';
import { queryKeys } from '@/lib/queryKeys';

interface CreateMentionNotificationParams {
  mentionedUserId: string;
  contextType: 'checkin' | 'comment';
  contextId: string;
  parentType: 'kr' | 'okr';
  parentId: string;
  contextUrl: string;
}

/**
 * Hook para notificações - migrado para usar o novo sistema centralizado.
 * Mantém a API legada para compatibilidade com código existente.
 * 
 * SAFE for pre-BU: Uses useOptionalBuClient() and guards mutations.
 */
export function useNotifications() {
  const { user } = useAuth();
  const { client, buId } = useOptionalBuClient();
  const queryClient = useQueryClient();

  // Get current user's profile for author name
  const getAuthorName = async (): Promise<string> => {
    if (!user?.id || !client) return 'Alguém';
    
    const { data } = await client
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();
    
    return data?.display_name || 'Alguém';
  };

  // Create mention notification using the new centralized system
  const createMentionNotification = useMutation({
    mutationFn: async (params: CreateMentionNotificationParams) => {
      if (!user?.id || !buId || !client) {
        throw new Error('User or BU not available');
      }

      const authorName = await getAuthorName();

      // Use the new emit_notification_event function
      const { data, error } = await client.rpc('emit_notification_event', {
        p_event_slug: 'core.mention',
        p_bu_id: buId,
        p_recipient_user_ids: [params.mentionedUserId],
        p_actor_id: user.id,
        p_title: `${authorName} mencionou você`,
        p_message: `Você foi mencionado em um ${params.contextType === 'checkin' ? 'check-in' : 'comentário'}`,
        p_context_type: params.contextType,
        p_context_id: params.contextId,
        p_context_url: params.contextUrl,
        p_metadata: {
          parent_type: params.parentType,
          parent_id: params.parentId,
          author_name: authorName,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });

  // Process mentions from text and create notifications
  const processMentions = async (
    text: string,
    contextType: 'checkin' | 'comment',
    contextId: string,
    parentType: 'kr' | 'okr',
    parentId: string,
    contextUrl: string
  ) => {
    // Extract user IDs from mention format: @[Name](user_id)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]); // user_id
    }

    // Create notifications for each unique mention
    const uniqueMentions = [...new Set(mentions)];
    
    for (const mentionedUserId of uniqueMentions) {
      try {
        await createMentionNotification.mutateAsync({
          mentionedUserId,
          contextType,
          contextId,
          parentType,
          parentId,
          contextUrl,
        });
      } catch (error) {
        // Don't block the main flow if notification fails
        console.error('Failed to create mention notification:', error);
      }
    }
  };

  return {
    createMentionNotification,
    processMentions,
  };
}
