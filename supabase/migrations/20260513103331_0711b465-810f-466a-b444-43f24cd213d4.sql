CREATE TYPE public.assessment_form_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.assessment_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.assessment_question_type AS ENUM ('short_text', 'long_text', 'single_choice', 'multiple_choice');
CREATE TYPE public.assessment_invite_status AS ENUM ('pending', 'started', 'submitted', 'expired', 'revoked');
CREATE TYPE public.assessment_run_status AS ENUM ('in_progress', 'submitted', 'expired', 'abandoned');

CREATE OR REPLACE FUNCTION public.has_assessment_permission(_user_id uuid, _bu_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_platform_admin(_user_id)
    OR public.is_bu_admin(_user_id, _bu_id)
    OR public.user_has_permission(_user_id, _bu_id, _key);
$$;

-- Generic bu_id auto-set trigger (uses current_bu_id())
CREATE OR REPLACE FUNCTION public.assessment_set_bu_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.bu_id IS NULL THEN
    NEW.bu_id := public.current_bu_id();
  END IF;
  RETURN NEW;
END;
$$;

-- assessment_themes
CREATE TABLE public.assessment_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_assessment_themes_bu ON public.assessment_themes(bu_id) WHERE deleted_at IS NULL;
ALTER TABLE public.assessment_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "themes_select" ON public.assessment_themes FOR SELECT TO authenticated
USING (deleted_at IS NULL AND (is_bu_member(auth.uid(), bu_id) OR is_platform_admin(auth.uid())));
CREATE POLICY "themes_insert" ON public.assessment_themes FOR INSERT TO authenticated
WITH CHECK (has_assessment_permission(auth.uid(), bu_id, 'assessments.theme.manage:bu'));
CREATE POLICY "themes_update" ON public.assessment_themes FOR UPDATE TO authenticated
USING (has_assessment_permission(auth.uid(), bu_id, 'assessments.theme.manage:bu'));
CREATE TRIGGER trg_assessment_themes_updated BEFORE UPDATE ON public.assessment_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assessment_themes_bu BEFORE INSERT ON public.assessment_themes
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_bu_id();

-- assessment_forms
CREATE TABLE public.assessment_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  theme_id uuid REFERENCES public.assessment_themes(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  level smallint NOT NULL DEFAULT 1,
  status public.assessment_form_status NOT NULL DEFAULT 'draft',
  current_version_id uuid,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_assessment_forms_bu ON public.assessment_forms(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_forms_theme ON public.assessment_forms(theme_id) WHERE deleted_at IS NULL;
ALTER TABLE public.assessment_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms_select" ON public.assessment_forms FOR SELECT TO authenticated
USING (deleted_at IS NULL AND has_assessment_permission(auth.uid(), bu_id, 'assessments.form.view:bu'));
CREATE POLICY "forms_insert" ON public.assessment_forms FOR INSERT TO authenticated
WITH CHECK (has_assessment_permission(auth.uid(), bu_id, 'assessments.form.create:bu'));
CREATE POLICY "forms_update" ON public.assessment_forms FOR UPDATE TO authenticated
USING (has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu'));
CREATE TRIGGER trg_assessment_forms_updated BEFORE UPDATE ON public.assessment_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assessment_forms_bu BEFORE INSERT ON public.assessment_forms
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_bu_id();

-- assessment_form_versions
CREATE TABLE public.assessment_form_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.assessment_forms(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  status public.assessment_form_status NOT NULL DEFAULT 'draft',
  frozen boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (form_id, version_number)
);
CREATE INDEX idx_assessment_versions_bu ON public.assessment_form_versions(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_versions_form ON public.assessment_form_versions(form_id) WHERE deleted_at IS NULL;
ALTER TABLE public.assessment_form_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions_select" ON public.assessment_form_versions FOR SELECT TO authenticated
USING (deleted_at IS NULL AND has_assessment_permission(auth.uid(), bu_id, 'assessments.form.view:bu'));
CREATE POLICY "versions_insert" ON public.assessment_form_versions FOR INSERT TO authenticated
WITH CHECK (has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu'));
CREATE POLICY "versions_update" ON public.assessment_form_versions FOR UPDATE TO authenticated
USING (has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu') AND frozen = false);
CREATE TRIGGER trg_assessment_versions_updated BEFORE UPDATE ON public.assessment_form_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assessment_versions_bu BEFORE INSERT ON public.assessment_form_versions
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_bu_id();

-- assessment_form_questions
CREATE TABLE public.assessment_form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.assessment_form_versions(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  question_type public.assessment_question_type NOT NULL DEFAULT 'long_text',
  prompt text NOT NULL,
  help_text text,
  required boolean NOT NULL DEFAULT true,
  time_limit_seconds integer NOT NULL DEFAULT 120,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_assessment_questions_version ON public.assessment_form_questions(version_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_questions_bu ON public.assessment_form_questions(bu_id) WHERE deleted_at IS NULL;
ALTER TABLE public.assessment_form_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_select" ON public.assessment_form_questions FOR SELECT TO authenticated
USING (deleted_at IS NULL AND has_assessment_permission(auth.uid(), bu_id, 'assessments.form.view:bu'));
CREATE POLICY "questions_insert" ON public.assessment_form_questions FOR INSERT TO authenticated
WITH CHECK (has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu'));
CREATE POLICY "questions_update" ON public.assessment_form_questions FOR UPDATE TO authenticated
USING (has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu'));
CREATE TRIGGER trg_assessment_questions_updated BEFORE UPDATE ON public.assessment_form_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assessment_questions_bu BEFORE INSERT ON public.assessment_form_questions
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_bu_id();

-- assessments
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.assessment_status NOT NULL DEFAULT 'draft',
  default_total_time_seconds integer,
  available_from timestamptz,
  available_until timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_assessments_bu ON public.assessments(bu_id) WHERE deleted_at IS NULL;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments_select" ON public.assessments FOR SELECT TO authenticated
USING (deleted_at IS NULL AND has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.view:bu'));
CREATE POLICY "assessments_insert" ON public.assessments FOR INSERT TO authenticated
WITH CHECK (has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.create:bu'));
CREATE POLICY "assessments_update" ON public.assessments FOR UPDATE TO authenticated
USING (has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.update:bu'));
CREATE TRIGGER trg_assessments_updated BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assessments_bu BEFORE INSERT ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_bu_id();

-- assessment_form_links
CREATE TABLE public.assessment_form_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.assessment_forms(id) ON DELETE RESTRICT,
  version_id uuid NOT NULL REFERENCES public.assessment_form_versions(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (assessment_id, form_id)
);
CREATE INDEX idx_assessment_links_assessment ON public.assessment_form_links(assessment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_links_bu ON public.assessment_form_links(bu_id) WHERE deleted_at IS NULL;
ALTER TABLE public.assessment_form_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "links_select" ON public.assessment_form_links FOR SELECT TO authenticated
USING (deleted_at IS NULL AND has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.view:bu'));
CREATE POLICY "links_insert" ON public.assessment_form_links FOR INSERT TO authenticated
WITH CHECK (has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.update:bu'));
CREATE POLICY "links_update" ON public.assessment_form_links FOR UPDATE TO authenticated
USING (has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.update:bu'));
CREATE TRIGGER trg_assessment_links_updated BEFORE UPDATE ON public.assessment_form_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assessment_links_bu BEFORE INSERT ON public.assessment_form_links
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_bu_id();

-- assessment_invites
CREATE TABLE public.assessment_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  invitee_cpf text NOT NULL,
  invitee_name text,
  invitee_email text,
  invitee_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.assessment_invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  sent_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  total_time_seconds integer,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_assessment_invites_bu ON public.assessment_invites(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_invites_assessment ON public.assessment_invites(assessment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_invites_cpf ON public.assessment_invites(invitee_cpf) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_invites_token ON public.assessment_invites(token);
ALTER TABLE public.assessment_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites_select" ON public.assessment_invites FOR SELECT TO authenticated
USING (deleted_at IS NULL AND has_assessment_permission(auth.uid(), bu_id, 'assessments.invite.view:bu'));
CREATE POLICY "invites_insert" ON public.assessment_invites FOR INSERT TO authenticated
WITH CHECK (has_assessment_permission(auth.uid(), bu_id, 'assessments.invite.create:bu'));
CREATE POLICY "invites_update" ON public.assessment_invites FOR UPDATE TO authenticated
USING (has_assessment_permission(auth.uid(), bu_id, 'assessments.invite.revoke:bu'));
CREATE TRIGGER trg_assessment_invites_updated BEFORE UPDATE ON public.assessment_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assessment_invites_bu BEFORE INSERT ON public.assessment_invites
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_bu_id();

-- assessment_runs
CREATE TABLE public.assessment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  invite_id uuid NOT NULL REFERENCES public.assessment_invites(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  respondent_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  respondent_cpf text NOT NULL,
  respondent_name text,
  status public.assessment_run_status NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  expires_at timestamptz,
  tab_switch_count integer NOT NULL DEFAULT 0,
  paste_attempt_count integer NOT NULL DEFAULT 0,
  copy_attempt_count integer NOT NULL DEFAULT 0,
  visibility_loss_seconds integer NOT NULL DEFAULT 0,
  client_meta jsonb,
  fraud_signals jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_assessment_runs_bu ON public.assessment_runs(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_runs_invite ON public.assessment_runs(invite_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assessment_runs_assessment ON public.assessment_runs(assessment_id) WHERE deleted_at IS NULL;
ALTER TABLE public.assessment_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_select" ON public.assessment_runs FOR SELECT TO authenticated
USING (deleted_at IS NULL AND has_assessment_permission(auth.uid(), bu_id, 'assessments.run.view:bu'));

-- assessment_answers
CREATE TABLE public.assessment_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.assessment_runs(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.assessment_form_questions(id) ON DELETE RESTRICT,
  answer_text text,
  answer_options jsonb,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  paste_detected boolean NOT NULL DEFAULT false,
  signals jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, question_id)
);
CREATE INDEX idx_assessment_answers_run ON public.assessment_answers(run_id);
CREATE INDEX idx_assessment_answers_bu ON public.assessment_answers(bu_id);
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_select" ON public.assessment_answers FOR SELECT TO authenticated
USING (has_assessment_permission(auth.uid(), bu_id, 'assessments.run.view:bu'));
CREATE TRIGGER trg_assessment_answers_updated BEFORE UPDATE ON public.assessment_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vínculo automático invite -> profile via CPF
CREATE OR REPLACE FUNCTION public.assessment_link_profile_by_cpf()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF NEW.invitee_profile_id IS NULL AND NEW.invitee_cpf IS NOT NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE cpf = NEW.invitee_cpf LIMIT 1;
    IF v_profile_id IS NOT NULL THEN
      NEW.invitee_profile_id := v_profile_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assessment_invites_link_profile
  BEFORE INSERT OR UPDATE ON public.assessment_invites
  FOR EACH ROW EXECUTE FUNCTION public.assessment_link_profile_by_cpf();