/**
 * Project Comments Types
 * Mirrors ticket_messages pattern for project-level discussions.
 */

export type RichTextContent = Record<string, unknown> | string;

export interface ProjectCommentAuthor {
  id: string;
  display_name: string | null;
  photo_url: string | null;
}

export interface ProjectComment {
  id: string;
  bu_id: string;
  project_id: string;
  author_user_id: string;
  body_richtext: RichTextContent;
  reply_to_comment_id: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_by_user_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  // Joined relations
  author_user: ProjectCommentAuthor | null;
  pinned_by: { id: string; display_name: string | null } | null;
  reply_to: {
    id: string;
    body_richtext: RichTextContent;
    author_user: { id: string; display_name: string | null } | null;
    attachments?: Array<{
      id: string;
      file_name: string;
      mime_type: string | null;
      deleted_at: string | null;
    }>;
  } | null;
}

export interface ProjectCommentAttachment {
  id: string;
  bu_id: string;
  project_id: string;
  comment_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by_user_id: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateCommentData {
  body_richtext: Record<string, unknown>;
  reply_to_comment_id?: string | null;
  mentions?: Array<{ user_id?: string; contact_id?: string }>;
  attachments?: File[];
}
