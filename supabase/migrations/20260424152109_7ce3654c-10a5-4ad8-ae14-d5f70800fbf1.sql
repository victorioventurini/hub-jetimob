-- ─────────────────────────────────────────────────────────────
-- KR Linking (XOR): Permitir vínculo de Projects/Milestones a
-- Team KRs OU Org KRs, garantindo exatamente um por linha.
--
-- Estratégia:
--   1) Adicionar coluna surrogate `id` (uuid PK).
--   2) Trocar PK composta atual por surrogate.
--   3) Criar UNIQUE índices parciais para evitar duplicatas
--      em cada par (project_id|milestone_id, kr_id).
--   4) Tornar key_result_id nullable e adicionar org_key_result_id.
--   5) Trigger XOR para validar exatamente um vínculo.
-- ─────────────────────────────────────────────────────────────

-- ── project_krs ──
ALTER TABLE public.project_krs
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.project_krs DROP CONSTRAINT IF EXISTS project_krs_pkey;
ALTER TABLE public.project_krs ADD CONSTRAINT project_krs_pkey PRIMARY KEY (id);

ALTER TABLE public.project_krs
  ADD COLUMN IF NOT EXISTS org_key_result_id uuid
    REFERENCES public.okr_org_key_results(id) ON DELETE CASCADE;

ALTER TABLE public.project_krs ALTER COLUMN key_result_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_krs_team
  ON public.project_krs (project_id, key_result_id)
  WHERE key_result_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_krs_org
  ON public.project_krs (project_id, org_key_result_id)
  WHERE org_key_result_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_krs_org_key_result_id
  ON public.project_krs (org_key_result_id)
  WHERE org_key_result_id IS NOT NULL;

-- ── milestone_krs ──
ALTER TABLE public.milestone_krs
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.milestone_krs DROP CONSTRAINT IF EXISTS milestone_krs_pkey;
ALTER TABLE public.milestone_krs ADD CONSTRAINT milestone_krs_pkey PRIMARY KEY (id);

ALTER TABLE public.milestone_krs
  ADD COLUMN IF NOT EXISTS org_key_result_id uuid
    REFERENCES public.okr_org_key_results(id) ON DELETE CASCADE;

ALTER TABLE public.milestone_krs ALTER COLUMN key_result_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_milestone_krs_team
  ON public.milestone_krs (milestone_id, key_result_id)
  WHERE key_result_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_milestone_krs_org
  ON public.milestone_krs (milestone_id, org_key_result_id)
  WHERE org_key_result_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_milestone_krs_org_key_result_id
  ON public.milestone_krs (org_key_result_id)
  WHERE org_key_result_id IS NOT NULL;

-- ── Trigger XOR ──
CREATE OR REPLACE FUNCTION public.enforce_one_kr_link_xor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.key_result_id IS NULL AND NEW.org_key_result_id IS NULL) THEN
    RAISE EXCEPTION 'KR link requires either key_result_id (team) or org_key_result_id (org)';
  END IF;
  IF (NEW.key_result_id IS NOT NULL AND NEW.org_key_result_id IS NOT NULL) THEN
    RAISE EXCEPTION 'KR link cannot have both key_result_id and org_key_result_id (XOR violation)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_krs_xor ON public.project_krs;
CREATE TRIGGER trg_project_krs_xor
  BEFORE INSERT OR UPDATE ON public.project_krs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_one_kr_link_xor();

DROP TRIGGER IF EXISTS trg_milestone_krs_xor ON public.milestone_krs;
CREATE TRIGGER trg_milestone_krs_xor
  BEFORE INSERT OR UPDATE ON public.milestone_krs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_one_kr_link_xor();
