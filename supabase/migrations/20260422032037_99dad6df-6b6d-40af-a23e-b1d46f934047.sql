-- ============================================================================
-- ONDA A — Sistema Centralizado de Presença em Ritos Coletivos
-- ============================================================================

-- 1. Tabela
CREATE TABLE public.ritual_session_attendance (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id               UUID NOT NULL REFERENCES public.okr_wizard_sessions(id) ON DELETE CASCADE,
  bu_id                    UUID NOT NULL REFERENCES public.bu_units(id),
  participant_profile_id   UUID NOT NULL REFERENCES public.profiles(id),
  participant_name         TEXT NOT NULL,
  participant_role         TEXT,
  participant_team_id      UUID REFERENCES public.teams(id),
  participant_team_name    TEXT,
  is_present               BOOLEAN NOT NULL,
  marked_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by_profile_id     UUID NOT NULL REFERENCES public.profiles(id),
  last_modified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ,
  CONSTRAINT uq_attendance_session_participant UNIQUE (session_id, participant_profile_id)
);

CREATE INDEX idx_attendance_session
  ON public.ritual_session_attendance(session_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_participant
  ON public.ritual_session_attendance(participant_profile_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_bu_marked_at
  ON public.ritual_session_attendance(bu_id, marked_at DESC) WHERE deleted_at IS NULL;

-- 2. Triggers padrão
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.ritual_session_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.fn_attendance_touch_modified()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_modified_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_touch_modified
  BEFORE UPDATE ON public.ritual_session_attendance
  FOR EACH ROW EXECUTE FUNCTION public.fn_attendance_touch_modified();

-- 3. Trigger de imutabilidade pos-conclusao
CREATE OR REPLACE FUNCTION public.fn_attendance_block_after_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status      public.wizard_session_status;
  v_session_bu  UUID;
BEGIN
  SELECT status, bu_id INTO v_status, v_session_bu
    FROM public.okr_wizard_sessions
   WHERE id = COALESCE(NEW.session_id, OLD.session_id);

  IF v_status = 'completed'
     AND NOT public.is_bu_admin(auth.uid(), v_session_bu)
     AND NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sessao ja encerrada — registro de presenca e imutavel (reabra o rito como Admin para editar)';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_attendance_block_after_completed
  BEFORE INSERT OR UPDATE OR DELETE ON public.ritual_session_attendance
  FOR EACH ROW EXECUTE FUNCTION public.fn_attendance_block_after_completed();

-- 4. RLS
ALTER TABLE public.ritual_session_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY ritual_session_attendance_select_v1
  ON public.ritual_session_attendance
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_bu_member(auth.uid(), bu_id)
      OR public.is_platform_admin(auth.uid())
    )
  );

CREATE POLICY ritual_session_attendance_insert_v1
  ON public.ritual_session_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_bu_member(auth.uid(), bu_id)
    AND marked_by_profile_id = public.my_profile_id()
    AND (
         public.has_permission(auth.uid(), bu_id, 'okrs.attendance.mark:bu')
      OR public.has_permission(auth.uid(), bu_id, 'okrs.attendance.mark:team')
      OR public.is_bu_admin(auth.uid(), bu_id)
      OR public.is_platform_admin(auth.uid())
    )
  );

CREATE POLICY ritual_session_attendance_update_v1
  ON public.ritual_session_attendance
  FOR UPDATE TO authenticated
  USING (
    public.is_bu_member(auth.uid(), bu_id)
    AND (
         public.has_permission(auth.uid(), bu_id, 'okrs.attendance.mark:bu')
      OR public.has_permission(auth.uid(), bu_id, 'okrs.attendance.mark:team')
      OR public.is_bu_admin(auth.uid(), bu_id)
      OR public.is_platform_admin(auth.uid())
    )
  )
  WITH CHECK (
    public.is_bu_member(auth.uid(), bu_id)
    AND marked_by_profile_id = public.my_profile_id()
  );

CREATE POLICY ritual_session_attendance_delete_v1
  ON public.ritual_session_attendance
  FOR DELETE TO authenticated
  USING (
    public.is_bu_admin(auth.uid(), bu_id)
    OR public.is_platform_admin(auth.uid())
  );

-- 5. View agregada
CREATE VIEW public.v_ritual_attendance_summary
WITH (security_invoker = true) AS
SELECT
  s.id            AS session_id,
  s.bu_id,
  s.wizard_type,
  s.team_id,
  s.cycle_id,
  s.status,
  s.completed_at,
  COUNT(a.id) FILTER (WHERE a.is_present)                            AS present_count,
  COUNT(a.id)                                                         AS total_count,
  CASE WHEN COUNT(a.id) > 0
       THEN ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.is_present) / COUNT(a.id), 1)
       ELSE NULL
  END                                                                 AS attendance_rate_pct
FROM public.okr_wizard_sessions s
LEFT JOIN public.ritual_session_attendance a
  ON a.session_id = s.id AND a.deleted_at IS NULL
GROUP BY s.id;

-- 6. Permission keys
INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status)
VALUES
  ('okrs.attendance.mark:bu', 'okrs', 'attendance', 'mark', 'bu',
   'Marcar presenca em ritos coletivos como condutor (Weekly, MBR, QBR, Pos-QBR)', 'active'),
  ('okrs.attendance.mark:team', 'okrs', 'attendance', 'mark', 'team',
   'Marcar presenca em Check-in do Time como lider do time', 'active'),
  ('okrs.attendance.view:bu', 'okrs', 'attendance', 'view', 'bu',
   'Visualizar registros de presenca em ritos coletivos', 'active')
ON CONFLICT (key) DO NOTHING;