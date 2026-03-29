/**
 * useProjectCommentMutations — Mutations for project comments
 * Mirrors useTicketMessageMutations pattern (simplified: internal-only, no status changes).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { supabase } from '@/integrations/supabase/globalClient';
import type { CreateCommentData } from '../types/comments';

export function useCreateProjectComment(profileId: string | null) {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  const buScopedSupabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: string;
      data: CreateCommentData;
    }) => {
      if (!buId) throw new Error('BU não selecionada');
      if (!profileId) throw new Error('Perfil não carregado');

      // Guard: ensure authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('NOT_AUTHENTICATED');

      // Insert comment
      const { data: comment, error } = await buScopedSupabase
        .from('project_comments')
        .insert({
          bu_id: buId,
          project_id: projectId,
          author_user_id: profileId,
          body_richtext: data.body_richtext as any,
          reply_to_comment_id: data.reply_to_comment_id ?? null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create mentions if provided
      if (data.mentions && data.mentions.length > 0) {
        const mentionInserts = data.mentions
          .filter((m) => m.user_id)
          .map((m) => ({
            bu_id: buId,
            entity_type: 'project_comment' as const,
            entity_id: comment.id,
            mentioned_user_id: m.user_id || null,
            mentioned_contact_id: null,
            created_by: profileId,
          }));

        if (mentionInserts.length > 0) {
          await buScopedSupabase.from('mentions').insert(mentionInserts);
        }
      }

      // Upload attachments if provided
      if (data.attachments && data.attachments.length > 0) {
        for (const file of data.attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${buId}/${projectId}/${comment.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await buScopedSupabase.storage
            .from('project-attachments')
            .upload(fileName, file, { contentType: file.type, upsert: false });

          if (uploadError) {
            console.error('Failed to upload file:', file.name, uploadError);
            continue;
          }

          await buScopedSupabase.from('project_comment_attachments').insert({
            bu_id: buId,
            project_id: projectId,
            comment_id: comment.id,
            file_url: uploadData.path,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by_user_id: profileId,
          });
        }
      }

      return comment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectsKeys.comments(variables.projectId),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: projectsKeys.commentAttachments(variables.projectId),
        refetchType: 'active',
      });
    },
  });
}

export function useEditProjectComment() {
  const queryClient = useQueryClient();
  const buScopedSupabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      body_richtext,
    }: {
      id: string;
      projectId: string;
      body_richtext: Record<string, unknown>;
    }) => {
      const { error } = await buScopedSupabase
        .from('project_comments')
        .update({
          body_richtext: body_richtext as any,
          edited_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: projectsKeys.comments(data.projectId),
        refetchType: 'active',
      });
    },
  });
}

export function useDeleteProjectComment() {
  const queryClient = useQueryClient();
  const buScopedSupabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await buScopedSupabase
        .from('project_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: projectsKeys.comments(data.projectId),
        refetchType: 'active',
      });
    },
  });
}

export function usePinProjectComment() {
  const queryClient = useQueryClient();
  const buScopedSupabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      commentId,
      projectId,
      pin,
      profileId,
    }: {
      commentId: string;
      projectId: string;
      pin: boolean;
      profileId: string;
    }) => {
      const { error } = await buScopedSupabase
        .from('project_comments')
        .update({
          is_pinned: pin,
          pinned_at: pin ? new Date().toISOString() : null,
          pinned_by_user_id: pin ? profileId : null,
        })
        .eq('id', commentId);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: projectsKeys.comments(data.projectId),
        refetchType: 'active',
      });
    },
  });
}
