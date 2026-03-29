
-- ============================================================
-- PROJECT COMMENTS & ATTACHMENTS
-- ============================================================

-- Table: project_comments (mirrors ticket_messages pattern)
CREATE TABLE public.project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES public.bu_units(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id),
  body_richtext JSONB NOT NULL DEFAULT '{}'::jsonb,
  reply_to_comment_id UUID REFERENCES public.project_comments(id),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  pinned_at TIMESTAMPTZ,
  pinned_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_project_comments_project_id_created ON public.project_comments(project_id, created_at);
CREATE INDEX idx_project_comments_bu_id ON public.project_comments(bu_id);

-- BU scope trigger
CREATE TRIGGER enforce_bu_scope_project_comments
  BEFORE INSERT ON public.project_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bu_scope();

-- RLS
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user in the BU
CREATE POLICY project_comments_select ON public.project_comments
  FOR SELECT TO authenticated
  USING (is_current_bu(bu_id) AND deleted_at IS NULL);

-- INSERT: any authenticated user in the BU (author must be self)
CREATE POLICY project_comments_insert ON public.project_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_bu(bu_id)
    AND author_user_id = my_profile_id()
  );

-- UPDATE: only author can edit their own comment
CREATE POLICY project_comments_update ON public.project_comments
  FOR UPDATE TO authenticated
  USING (
    is_current_bu(bu_id)
    AND (
      author_user_id = my_profile_id()
      OR is_bu_admin(auth.uid(), bu_id)
    )
  )
  WITH CHECK (
    is_current_bu(bu_id)
  );

-- DELETE (soft): author or admin
CREATE POLICY project_comments_delete ON public.project_comments
  FOR DELETE TO authenticated
  USING (
    is_current_bu(bu_id)
    AND (
      author_user_id = my_profile_id()
      OR is_bu_admin(auth.uid(), bu_id)
    )
  );

-- Table: project_comment_attachments
CREATE TABLE public.project_comment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES public.bu_units(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_project_comment_attachments_comment ON public.project_comment_attachments(comment_id);

-- BU scope trigger
CREATE TRIGGER enforce_bu_scope_project_comment_attachments
  BEFORE INSERT ON public.project_comment_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bu_scope();

-- RLS
ALTER TABLE public.project_comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_comment_attachments_select ON public.project_comment_attachments
  FOR SELECT TO authenticated
  USING (is_current_bu(bu_id) AND deleted_at IS NULL);

CREATE POLICY project_comment_attachments_insert ON public.project_comment_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_bu(bu_id)
    AND uploaded_by_user_id = my_profile_id()
  );

-- Storage bucket for project attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-attachments', 'project-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload
CREATE POLICY project_attachments_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-attachments');

-- Storage RLS: authenticated users can read
CREATE POLICY project_attachments_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-attachments');

-- Enable realtime for project_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
