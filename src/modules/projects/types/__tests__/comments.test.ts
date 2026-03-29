import { describe, it, expect } from 'vitest';
import type { ProjectComment, ProjectCommentAttachment, RichTextContent } from '../comments';

describe('Project Comments Types', () => {
  it('ProjectComment satisfies required shape', () => {
    const comment: ProjectComment = {
      id: 'c-1',
      bu_id: 'bu-1',
      project_id: 'proj-1',
      author_user_id: 'user-1',
      body_richtext: { type: 'text', content: 'Hello' },
      reply_to_comment_id: null,
      is_pinned: false,
      pinned_at: null,
      pinned_by_user_id: null,
      created_at: '2026-01-01T00:00:00Z',
      edited_at: null,
      deleted_at: null,
      author_user: { id: 'user-1', display_name: 'Test', photo_url: null },
      pinned_by: null,
      reply_to: null,
    };
    expect(comment.id).toBe('c-1');
    expect(comment.author_user?.display_name).toBe('Test');
  });

  it('ProjectCommentAttachment satisfies required shape', () => {
    const att: ProjectCommentAttachment = {
      id: 'att-1',
      bu_id: 'bu-1',
      project_id: 'proj-1',
      comment_id: 'c-1',
      file_url: 'bu-1/proj-1/c-1/file.pdf',
      file_name: 'file.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      uploaded_by_user_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      deleted_at: null,
    };
    expect(att.file_name).toBe('file.pdf');
  });

  it('RichTextContent accepts string', () => {
    const content: RichTextContent = 'plain text';
    expect(content).toBe('plain text');
  });

  it('RichTextContent accepts object', () => {
    const content: RichTextContent = { type: 'text', content: 'hello' };
    expect((content as any).type).toBe('text');
  });
});
