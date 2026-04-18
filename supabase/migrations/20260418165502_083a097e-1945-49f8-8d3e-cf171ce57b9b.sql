-- ============================================================
-- ANALYSIS COMMENTS — extend with reply/pin/richtext support
-- ============================================================

ALTER TABLE public.analysis_comments
  ADD COLUMN IF NOT EXISTS reply_to_comment_id uuid REFERENCES public.analysis_comments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS body_richtext jsonb,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_analysis_comments_reply_to
  ON public.analysis_comments(reply_to_comment_id) WHERE reply_to_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_comments_pinned
  ON public.analysis_comments(report_id) WHERE is_pinned = true;

-- ============================================================
-- ANALYSIS DECISIONS — separate table for decisions originated
-- from a specific analysis report. Stores TeamCheckinDecision[]
-- shape inside `decisions` JSONB array (mirrors okr_wizard_sessions
-- pattern, allowing reuse of useDecisionThread/DecisionFollowUpRow).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analysis_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.analysis_reports(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (report_id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_decisions_report
  ON public.analysis_decisions(report_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analysis_decisions_bu
  ON public.analysis_decisions(bu_id) WHERE deleted_at IS NULL;

ALTER TABLE public.analysis_decisions ENABLE ROW LEVEL SECURITY;

-- SELECT: BU members with read permission
CREATE POLICY analysis_decisions_select_v1
  ON public.analysis_decisions
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND is_profile_bu_member(my_profile_id(), bu_id)
  );

-- INSERT: must be authoring profile + BU member
CREATE POLICY analysis_decisions_insert_v1
  ON public.analysis_decisions
  FOR INSERT
  WITH CHECK (
    created_by = my_profile_id()
    AND is_profile_bu_member(my_profile_id(), bu_id)
  );

-- UPDATE: BU members with read permission can update (decisions thread/follow-up)
CREATE POLICY analysis_decisions_update_v1
  ON public.analysis_decisions
  FOR UPDATE
  USING (is_profile_bu_member(my_profile_id(), bu_id));

-- DELETE: only author or admin
CREATE POLICY analysis_decisions_delete_v1
  ON public.analysis_decisions
  FOR DELETE
  USING (
    created_by = my_profile_id()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_analysis_decisions_updated_at ON public.analysis_decisions;
CREATE TRIGGER trg_analysis_decisions_updated_at
  BEFORE UPDATE ON public.analysis_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();