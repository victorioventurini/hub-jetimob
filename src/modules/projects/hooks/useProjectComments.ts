/**
 * useProjectComments — Query hook for project comments
 * Mirrors useTicketMessages pattern.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { projectsKeys } from '@/lib/queryKeys/projects';
import type { ProjectComment, ProjectCommentAttachment } from '../types/comments';

export function useProjectComments(projectId: string | null) {
  const buScopedSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: projectsKeys.comments(projectId ?? ''),
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await buScopedSupabase
        .from('project_comments')
        .select(`
          id,
          bu_id,
          project_id,
          author_user_id,
          body_richtext,
          reply_to_comment_id,
          is_pinned,
          pinned_at,
          pinned_by_user_id,
          created_at,
          edited_at,
          deleted_at,
          author_user:profiles!author_user_id(id, display_name, photo_url),
          pinned_by:profiles!pinned_by_user_id(id, display_name),
          reply_to:project_comments!reply_to_comment_id(
            id,
            body_richtext,
            author_user:profiles!author_user_id(id, display_name),
            attachments:project_comment_attachments!comment_id(id, file_name, mime_type, deleted_at)
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as ProjectComment[];
    },
    enabled: !!projectId,
  });
}

export function useProjectCommentAttachments(projectId: string | null) {
  const buScopedSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: projectsKeys.commentAttachments(projectId ?? ''),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await buScopedSupabase
        .from('project_comment_attachments')
        .select(`
          id, bu_id, project_id, comment_id,
          file_url, file_name, file_size, mime_type,
          uploaded_by_user_id, created_at, deleted_at
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as ProjectCommentAttachment[];
    },
    enabled: !!projectId,
  });
}
