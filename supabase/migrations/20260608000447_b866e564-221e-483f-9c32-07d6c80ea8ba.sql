-- ============================================================
-- okr_org_checkins — histórico de check-ins para KRs organizacionais
-- Espelha okr_checkins (team) mas com FK para okr_org_key_results.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.okr_org_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id uuid NOT NULL REFERENCES public.okr_org_key_results(id) ON DELETE CASCADE,
  bu_id uuid NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  previous_value numeric NOT NULL,
  current_value numeric NOT NULL,
  confidence text NOT NULL,
  blockers text,
  comments text,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_okr_org_checkins_kr_id ON public.okr_org_checkins(kr_id);
CREATE INDEX IF NOT EXISTS idx_okr_org_checkins_bu_id ON public.okr_org_checkins(bu_id);
CREATE INDEX IF NOT EXISTS idx_okr_org_checkins_user_id ON public.okr_org_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_okr_org_checkins_date ON public.okr_org_checkins(date DESC);

-- ============================================================
-- Trigger: preenche bu_id automaticamente a partir da Org KR
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_bu_id_from_org_kr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_id uuid;
BEGIN
  SELECT bu_id INTO v_bu_id FROM public.okr_org_key_results WHERE id = NEW.kr_id;
  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'KR organizacional % não encontrada ou sem BU', NEW.kr_id;
  END IF;
  NEW.bu_id := v_bu_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_okr_org_checkins_set_bu_id
  BEFORE INSERT ON public.okr_org_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_bu_id_from_org_kr();

-- ============================================================
-- Trigger: validação de campos (confidence ∈ {high,medium,low})
-- Seguindo a regra "NEVER CHECK constraints; usar Validation Triggers"
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_okr_org_checkin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.confidence NOT IN ('high', 'medium', 'low') THEN
    RAISE EXCEPTION 'confidence inválida: %', NEW.confidence;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_okr_org_checkins_validate
  BEFORE INSERT OR UPDATE ON public.okr_org_checkins
  FOR EACH ROW EXECUTE FUNCTION public.validate_okr_org_checkin();

-- ============================================================
-- Trigger: updated_at
-- ============================================================
CREATE TRIGGER trg_okr_org_checkins_updated_at
  BEFORE UPDATE ON public.okr_org_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Helper SECURITY DEFINER: pode criar check-in nesta Org KR?
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_checkin_org_kr(_kr_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.okr_org_key_results kr
    WHERE kr.id = _kr_id
      AND kr.deleted_at IS NULL
      AND kr.cancelled_at IS NULL
      AND (
        kr.owner_user_id = _profile_id
        OR public.has_permission(_profile_id, kr.bu_id, 'okrs.org_objective.update:bu')
        OR public.is_bu_admin(_profile_id, kr.bu_id)
      )
  );
$$;

-- ============================================================
-- GRANTs (obrigatório — Data API não tem default grants no public)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.okr_org_checkins TO authenticated;
GRANT ALL ON public.okr_org_checkins TO service_role;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.okr_org_checkins ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da BU com permissão de leitura de OKRs/checkins
CREATE POLICY okr_org_checkins_select
  ON public.okr_org_checkins
  FOR SELECT
  TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
    AND (
      has_permission(my_profile_id(), bu_id, 'okrs.checkin.read:team_tree')
      OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
    )
  );

-- INSERT: owner da Org KR ou BU Admin (defesa em profundidade — UI também filtra)
CREATE POLICY okr_org_checkins_insert
  ON public.okr_org_checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = my_profile_id()
    AND can_checkin_org_kr(kr_id, my_profile_id())
  );

-- UPDATE: apenas o autor do próprio check-in
CREATE POLICY okr_org_checkins_update
  ON public.okr_org_checkins
  FOR UPDATE
  TO authenticated
  USING (user_id = my_profile_id())
  WITH CHECK (user_id = my_profile_id());

-- DELETE: apenas BU admin
CREATE POLICY okr_org_checkins_delete
  ON public.okr_org_checkins
  FOR DELETE
  TO authenticated
  USING (is_bu_admin(my_profile_id(), bu_id));