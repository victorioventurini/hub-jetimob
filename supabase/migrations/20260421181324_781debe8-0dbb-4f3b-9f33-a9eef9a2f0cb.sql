-- Fase 0 — Padronização Estrutural dos Ritos
-- 1) Adicionar coluna structure_version (controle de versão estrutural por sessão)
ALTER TABLE public.okr_wizard_sessions
  ADD COLUMN IF NOT EXISTS structure_version text NOT NULL DEFAULT 'v1';

COMMENT ON COLUMN public.okr_wizard_sessions.structure_version IS
  'Versão estrutural do rito no momento da gravação. v1 = pré-padronização; v2/v3/v4 = ondas do framework unificado. Usado pelo RitualHistoryPage para renderização determinística.';

-- 2) Corrigir bug latente: CHECK constraint do wizard_type não inclui mbr-pre, mbr-first, mbr-pre-first
ALTER TABLE public.okr_wizard_sessions
  DROP CONSTRAINT IF EXISTS okr_wizard_sessions_wizard_type_check;

ALTER TABLE public.okr_wizard_sessions
  ADD CONSTRAINT okr_wizard_sessions_wizard_type_check
  CHECK (wizard_type = ANY (ARRAY[
    'collaborator'::text,
    'leader-prep'::text,
    'team-checkin'::text,
    'managers-checkin'::text,
    'clevel-checkin'::text,
    'team-okr-creation'::text,
    'team-kr-creation'::text,
    'mbr'::text,
    'mbr-pre'::text,
    'mbr-first'::text,
    'mbr-pre-first'::text,
    'qbr-pre'::text,
    'qbr-pre-clevel'::text,
    'qbr-meeting'::text,
    'qbr-post'::text,
    'qbr-report'::text
  ]));

-- 3) Index de performance para RitualHistoryPage
CREATE INDEX IF NOT EXISTS idx_okr_wizard_sessions_type_struct_version
  ON public.okr_wizard_sessions (wizard_type, structure_version);