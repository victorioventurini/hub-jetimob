-- ============================================================
-- MÓDULO ANÁLISE ESTRATÉGICA (/analysis) — schema, RLS, módulo, permissões
-- ============================================================

-- 1) ENUMs
CREATE TYPE public.analysis_mode AS ENUM ('auto','manual','mixed');
CREATE TYPE public.analysis_depth AS ENUM ('auto','minimal','standard','full');
CREATE TYPE public.analysis_status AS ENUM ('pending','generating','complete','failed');
CREATE TYPE public.analysis_schedule_frequency AS ENUM ('weekly','monthly','per_cycle');
CREATE TYPE public.analysis_template_scope AS ENUM ('global','bu');

-- 2) analysis_reports
CREATE TABLE public.analysis_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text,
  premise text NOT NULL,
  additional_context text,
  mode public.analysis_mode NOT NULL DEFAULT 'auto',
  modules text[] NOT NULL DEFAULT '{}',
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  period jsonb NOT NULL DEFAULT '{}'::jsonb,
  depth public.analysis_depth NOT NULL DEFAULT 'auto',
  status public.analysis_status NOT NULL DEFAULT 'pending',
  result jsonb,
  sources jsonb,
  suggested_actions jsonb,
  error_message text,
  template_id uuid,
  generated_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analysis_reports_bu_created ON public.analysis_reports(bu_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_analysis_reports_created_by ON public.analysis_reports(created_by);
CREATE INDEX idx_analysis_reports_status ON public.analysis_reports(status);

-- 3) analysis_feedback
CREATE TABLE public.analysis_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.analysis_reports(id) ON DELETE CASCADE,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);
CREATE INDEX idx_analysis_feedback_report ON public.analysis_feedback(report_id);
CREATE INDEX idx_analysis_feedback_bu ON public.analysis_feedback(bu_id);

CREATE OR REPLACE FUNCTION public.validate_analysis_feedback_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'analysis_feedback.rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_analysis_feedback_rating
  BEFORE INSERT OR UPDATE ON public.analysis_feedback
  FOR EACH ROW EXECUTE FUNCTION public.validate_analysis_feedback_rating();

-- 4) analysis_comments
CREATE TABLE public.analysis_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.analysis_reports(id) ON DELETE CASCADE,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analysis_comments_report ON public.analysis_comments(report_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_analysis_comments_bu ON public.analysis_comments(bu_id);

-- 5) analysis_templates
CREATE TABLE public.analysis_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope public.analysis_template_scope NOT NULL DEFAULT 'global',
  bu_id uuid REFERENCES public.bu_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  premise text NOT NULL,
  defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_admin_only boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 100,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analysis_templates_scope ON public.analysis_templates(scope) WHERE deleted_at IS NULL;
CREATE INDEX idx_analysis_templates_bu ON public.analysis_templates(bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_analysis_templates_category ON public.analysis_templates(category);

-- 6) analysis_schedules
CREATE TABLE public.analysis_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.analysis_templates(id) ON DELETE CASCADE,
  frequency public.analysis_schedule_frequency NOT NULL,
  day_of_period smallint,
  hour_local smallint NOT NULL DEFAULT 8,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analysis_schedules_bu ON public.analysis_schedules(bu_id);
CREATE INDEX idx_analysis_schedules_due ON public.analysis_schedules(next_run_at) WHERE is_active = true;

-- 7) analysis_share_log
CREATE TABLE public.analysis_share_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.analysis_reports(id) ON DELETE CASCADE,
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analysis_share_log_report ON public.analysis_share_log(report_id);
CREATE INDEX idx_analysis_share_log_bu ON public.analysis_share_log(bu_id);

-- 8) updated_at triggers
CREATE TRIGGER trg_analysis_reports_updated_at BEFORE UPDATE ON public.analysis_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_analysis_feedback_updated_at BEFORE UPDATE ON public.analysis_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_analysis_comments_updated_at BEFORE UPDATE ON public.analysis_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_analysis_templates_updated_at BEFORE UPDATE ON public.analysis_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_analysis_schedules_updated_at BEFORE UPDATE ON public.analysis_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_share_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_reports_select_v1" ON public.analysis_reports FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_profile_bu_member(public.my_profile_id(), bu_id));
CREATE POLICY "analysis_reports_insert_v1" ON public.analysis_reports FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(public.my_profile_id(), bu_id, 'analysis.report.create:bu')
    AND created_by = public.my_profile_id()
  );
CREATE POLICY "analysis_reports_update_v1" ON public.analysis_reports FOR UPDATE TO authenticated
  USING (
    public.is_profile_bu_member(public.my_profile_id(), bu_id)
    AND (created_by = public.my_profile_id() OR public.has_role(auth.uid(), 'admin'::app_role))
  );
CREATE POLICY "analysis_reports_delete_v1" ON public.analysis_reports FOR DELETE TO authenticated
  USING (
    (created_by = public.my_profile_id() AND public.has_permission(public.my_profile_id(), bu_id, 'analysis.report.delete:self'))
    OR public.has_permission(public.my_profile_id(), bu_id, 'analysis.report.delete:bu')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "analysis_feedback_select_v1" ON public.analysis_feedback FOR SELECT TO authenticated
  USING (public.is_profile_bu_member(public.my_profile_id(), bu_id));
CREATE POLICY "analysis_feedback_insert_v1" ON public.analysis_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = public.my_profile_id() AND public.is_profile_bu_member(public.my_profile_id(), bu_id));
CREATE POLICY "analysis_feedback_update_v1" ON public.analysis_feedback FOR UPDATE TO authenticated
  USING (user_id = public.my_profile_id());
CREATE POLICY "analysis_feedback_delete_v1" ON public.analysis_feedback FOR DELETE TO authenticated
  USING (user_id = public.my_profile_id() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "analysis_comments_select_v1" ON public.analysis_comments FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_profile_bu_member(public.my_profile_id(), bu_id));
CREATE POLICY "analysis_comments_insert_v1" ON public.analysis_comments FOR INSERT TO authenticated
  WITH CHECK (author_profile_id = public.my_profile_id() AND public.is_profile_bu_member(public.my_profile_id(), bu_id));
CREATE POLICY "analysis_comments_update_v1" ON public.analysis_comments FOR UPDATE TO authenticated
  USING (author_profile_id = public.my_profile_id() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "analysis_comments_delete_v1" ON public.analysis_comments FOR DELETE TO authenticated
  USING (author_profile_id = public.my_profile_id() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "analysis_templates_select_v1" ON public.analysis_templates FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      scope = 'global'
      OR (scope = 'bu' AND public.is_profile_bu_member(public.my_profile_id(), bu_id))
    )
    AND (
      is_admin_only = false
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );
CREATE POLICY "analysis_templates_insert_v1" ON public.analysis_templates FOR INSERT TO authenticated
  WITH CHECK (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'bu' AND public.has_permission(public.my_profile_id(), bu_id, 'analysis.template.manage:bu'))
  );
CREATE POLICY "analysis_templates_update_v1" ON public.analysis_templates FOR UPDATE TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'bu' AND public.has_permission(public.my_profile_id(), bu_id, 'analysis.template.manage:bu'))
  );
CREATE POLICY "analysis_templates_delete_v1" ON public.analysis_templates FOR DELETE TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'bu' AND public.has_permission(public.my_profile_id(), bu_id, 'analysis.template.manage:bu'))
  );

CREATE POLICY "analysis_schedules_select_v1" ON public.analysis_schedules FOR SELECT TO authenticated
  USING (public.is_profile_bu_member(public.my_profile_id(), bu_id));
CREATE POLICY "analysis_schedules_manage_v1" ON public.analysis_schedules FOR ALL TO authenticated
  USING (public.has_permission(public.my_profile_id(), bu_id, 'analysis.schedule.manage:bu'))
  WITH CHECK (public.has_permission(public.my_profile_id(), bu_id, 'analysis.schedule.manage:bu'));

CREATE POLICY "analysis_share_log_select_v1" ON public.analysis_share_log FOR SELECT TO authenticated
  USING (public.is_profile_bu_member(public.my_profile_id(), bu_id));

-- ============================================================
-- Módulo + permissões
-- ============================================================
INSERT INTO public.modules (slug, name, description, type, route, display_order, status)
VALUES ('analysis','Análise Estratégica','Análises estratégicas com IA cruzando KPIs, OKRs, Projetos, Iniciativas, Check-ins e Wizards','operational','/analysis', 160, 'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status) VALUES
  ('analysis.report.create:bu','analysis','report','create','bu'::permission_scope,'Criar análises estratégicas na BU','active'::catalog_status),
  ('analysis.report.view:bu','analysis','report','view','bu'::permission_scope,'Ver análises estratégicas da BU','active'::catalog_status),
  ('analysis.report.delete:self','analysis','report','delete','self'::permission_scope,'Excluir as próprias análises','active'::catalog_status),
  ('analysis.report.delete:bu','analysis','report','delete','bu'::permission_scope,'Excluir qualquer análise da BU','active'::catalog_status),
  ('analysis.template.manage:bu','analysis','template','manage','bu'::permission_scope,'Gerenciar templates de análise da BU','active'::catalog_status),
  ('analysis.schedule.manage:bu','analysis','schedule','manage','bu'::permission_scope,'Gerenciar agendamentos de análise da BU','active'::catalog_status)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Notification events
-- ============================================================
INSERT INTO public.notification_events (slug, module, name, description, audience, severity, default_channels)
VALUES
  ('analysis.shared','analysis','Análise Compartilhada','Notificação quando uma análise estratégica é compartilhada','internal'::notification_audience,'info'::notification_severity, ARRAY['email','in_app']),
  ('analysis.scheduled','analysis','Análise Agendada Disponível','Notificação quando uma análise agendada é gerada','internal'::notification_audience,'info'::notification_severity, ARRAY['email','in_app'])
ON CONFLICT (slug) DO NOTHING;
