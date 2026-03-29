/**
 * ProjectCommentsSection — Full comment thread for a project
 * 
 * Uses the generic messaging system (MessageBubble, ReplyPreview)
 * with project-specific hooks. Pattern mirrors TicketMessages.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Paperclip, X, FileIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageBubble, ReplyPreview } from '@/components/messaging';
import type { GenericMessage, MessageThreadConfig } from '@/components/messaging/types';
import { MentionInput, type ParsedMention } from '@/components/mentions';
import { useProjectComments, useProjectCommentAttachments } from '../hooks/useProjectComments';
import { useCreateProjectComment, usePinProjectComment } from '../hooks/useProjectCommentMutations';
import { useIdentity } from '@/hooks/useIdentity';
import { supabase } from '@/integrations/supabase/globalClient';
import { toast } from 'sonner';
import { parseMentionsForDisplay } from '@/lib/mentions';
import type { ProjectComment, ProjectCommentAttachment, RichTextContent } from '../types/comments';

const THREAD_CONFIG: MessageThreadConfig = {
  allowExternalParticipants: false,
  allowPinning: true,
  allowReply: true,
  allowAttachments: true,
  allowMentions: true,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

function getMessageText(body: RichTextContent): string {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    const content = (body as any).content;
    if (typeof content === 'string') return content;
  }
  return '';
}

function commentToGeneric(
  comment: ProjectComment,
  attachments: ProjectCommentAttachment[],
): GenericMessage {
  const authorName = comment.author_user?.display_name ?? 'Alguém';
  const commentAttachments = attachments.filter((a) => a.comment_id === comment.id);

  const replyTo = comment.reply_to
    ? {
        id: comment.reply_to.id,
        content: getMessageText(comment.reply_to.body_richtext as RichTextContent),
        authorName: comment.reply_to.author_user?.display_name ?? 'Alguém',
      }
    : null;

  return {
    id: comment.id,
    content: getMessageText(comment.body_richtext),
    createdAt: comment.created_at,
    editedAt: comment.edited_at,
    author: {
      id: comment.author_user_id,
      name: authorName,
      photoUrl: comment.author_user?.photo_url ?? null,
      type: 'internal',
    },
    isPinned: comment.is_pinned,
    attachments: commentAttachments.map((a) => ({
      id: a.id,
      fileName: a.file_name,
      fileSize: a.file_size,
      mimeType: a.mime_type,
      storagePath: a.file_url,
    })),
    replyTo,
  };
}

interface SelectedFile {
  file: File;
  id: string;
  previewUrl?: string;
}

interface ProjectCommentsSectionProps {
  projectId: string;
}

export function ProjectCommentsSection({ projectId }: ProjectCommentsSectionProps) {
  const { profileId, realProfileId } = useIdentity();
  const writerProfileId = realProfileId ?? profileId;

  const { data: comments = [], isLoading } = useProjectComments(projectId);
  const { data: attachments = [] } = useProjectCommentAttachments(projectId);
  const createComment = useCreateProjectComment(writerProfileId);
  const pinComment = usePinProjectComment();

  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<ParsedMention[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [replyingTo, setReplyingTo] = useState<GenericMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const genericMessages = useMemo(
    () => comments.map((c) => commentToGeneric(c, attachments)),
    [comments, attachments],
  );

  const handleContentChange = useCallback((value: string, parsed: ParsedMention[]) => {
    setContent(value);
    setMentions(parsed);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > MAX_FILES) {
      toast.error(`Máximo de ${MAX_FILES} arquivos permitidos`);
      return;
    }
    const valid: SelectedFile[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { toast.error(`"${file.name}" excede 10MB`); continue; }
      if (!ALLOWED_TYPES.includes(file.type)) { toast.error(`Tipo não permitido: ${file.name}`); continue; }
      const sf: SelectedFile = { file, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      if (file.type.startsWith('image/')) sf.previewUrl = URL.createObjectURL(file);
      valid.push(sf);
    }
    setSelectedFiles((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [selectedFiles.length]);

  const removeFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const handleSend = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;
    try {
      await createComment.mutateAsync({
        projectId,
        data: {
          body_richtext: { type: 'text', content: content.trim() },
          reply_to_comment_id: replyingTo?.id ?? null,
          mentions: mentions.map((m) => ({ user_id: m.userId, contact_id: m.contactId })),
          attachments: selectedFiles.map((sf) => sf.file),
        },
      });
      setContent('');
      setMentions([]);
      selectedFiles.forEach((sf) => { if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl); });
      setSelectedFiles([]);
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to send comment:', err);
      toast.error('Erro ao enviar comentário.');
    }
  };

  const handleReply = useCallback((msg: GenericMessage) => {
    setReplyingTo(msg);
  }, []);

  const handleTogglePin = useCallback((messageId: string, pin: boolean) => {
    if (!writerProfileId) return;
    pinComment.mutate({ commentId: messageId, projectId, pin, profileId: writerProfileId });
  }, [writerProfileId, projectId, pinComment]);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const renderContent = useCallback((text: string) => {
    return <span dangerouslySetInnerHTML={{ __html: parseMentionsForDisplay(text) }} />;
  }, []);

  const renderAttachments = useCallback((atts: any[]) => {
    return atts.map((a: any) => (
      <AttachmentChip key={a.id} fileName={a.fileName} storagePath={a.storagePath} />
    ));
  }, []);

  const canSend = (content.trim().length > 0 || selectedFiles.length > 0) && !createComment.isPending;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comentários
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : genericMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum comentário ainda. Inicie a conversa!
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="space-y-4 max-h-[500px] overflow-y-auto pr-1"
          >
            {genericMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwnMessage={msg.author.id === writerProfileId}
                config={THREAD_CONFIG}
                onReply={handleReply}
                onTogglePin={handleTogglePin}
                isPinning={pinComment.isPending}
                onScrollToMessage={handleScrollToMessage}
                renderContent={renderContent}
                renderAttachments={renderAttachments}
              />
            ))}
          </div>
        )}

        {/* Composer */}
        {writerProfileId && (
          <div className="space-y-3 border-t pt-4">
            {/* Selected files */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((sf) => (
                  <div
                    key={sf.id}
                    className="relative group flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border"
                  >
                    {sf.previewUrl ? (
                      <img src={sf.previewUrl} alt={sf.file.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <FileIcon className="w-6 h-6 text-muted-foreground" />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate max-w-[150px]">{sf.file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(sf.file.size)}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 absolute -top-2 -right-2 bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(sf.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Reply preview */}
            {replyingTo && (
              <ReplyPreview
                replyingTo={replyingTo}
                onCancel={() => setReplyingTo(null)}
              />
            )}

            {/* Input row */}
            <div className={cn(
              'flex gap-2 items-end',
              replyingTo && 'border border-t-0 border-border rounded-b-lg p-2 -mt-3',
            )}>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={createComment.isPending || selectedFiles.length >= MAX_FILES}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={createComment.isPending || selectedFiles.length >= MAX_FILES}
                  className="shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1">
                <MentionInput
                  value={content}
                  onChange={handleContentChange}
                  context="internal"
                  placeholder="Digite seu comentário... Use @ para mencionar"
                  rows={2}
                  className="min-h-[60px]"
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={!canSend}
                className="shrink-0"
                isLoading={createComment.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Use <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">@</kbd> para mencionar
              {' '}• <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">⌘+Enter</kbd> para enviar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Small chip for attached files with signed URL download */
function AttachmentChip({ fileName, storagePath }: { fileName: string; storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (storagePath.startsWith('http')) {
      setUrl(storagePath);
      return;
    }
    supabase.storage
      .from('project-attachments')
      .createSignedUrl(storagePath, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [storagePath]);

  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs hover:bg-accent transition-colors"
    >
      <FileIcon className="h-3 w-3" />
      <span className="truncate max-w-[120px]">{fileName}</span>
    </a>
  );
}
