-- ============================================================================
-- Template — Tabela BU-Scoped
-- ----------------------------------------------------------------------------
-- Use este template para QUALQUER tabela operacional que armazene dados
-- pertencentes a uma Business Unit (BU). Garante isolamento multi-tenancy
-- via RLS, trigger automático de bu_id, e índice composto.
--
-- Substitua: __TABLE__ pelo nome da tabela (ex: my_table)
--           __DOMAIN__ pelo prefixo de policy (ex: my_table)
--           __EXTRA_COLS__ pelas suas colunas de domínio
-- ============================================================================

CREATE TABLE public.__TABLE__ (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id           UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  -- __EXTRA_COLS__: adicione colunas de domínio aqui
  --   name        TEXT NOT NULL,
  --   status      TEXT NOT NULL DEFAULT 'active',
  --   owner_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Standard fields (não documentar em migrations user-facing):
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- Índice composto BU-first (regra: toda query começa com bu_id)
CREATE INDEX idx___TABLE___bu_id ON public.__TABLE__(bu_id) WHERE deleted_at IS NULL;
-- Adicione índices secundários conforme necessidade:
-- CREATE INDEX idx___TABLE___bu_status ON public.__TABLE__(bu_id, status) WHERE deleted_at IS NULL;

-- ============================================================================
-- RLS — todas tabelas operacionais devem ter RLS ativo
-- ============================================================================
ALTER TABLE public.__TABLE__ ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da BU veem registros não-deletados
CREATE POLICY "__DOMAIN___select"
  ON public.__TABLE__ FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (is_bu_member(auth.uid(), bu_id) OR is_platform_admin(auth.uid()))
  );

-- INSERT: usuários da BU criam registros (bu_id setado pelo trigger)
CREATE POLICY "__DOMAIN___insert"
  ON public.__TABLE__ FOR INSERT
  TO authenticated
  WITH CHECK (
    is_bu_member(auth.uid(), bu_id) OR is_platform_admin(auth.uid())
  );

-- UPDATE: criador OU admin da BU pode atualizar
CREATE POLICY "__DOMAIN___update"
  ON public.__TABLE__ FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR is_bu_admin(auth.uid(), bu_id)
      OR is_platform_admin(auth.uid())
    )
  );

-- DELETE (soft): apenas admin da BU
CREATE POLICY "__DOMAIN___delete"
  ON public.__TABLE__ FOR UPDATE
  TO authenticated
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()))
  WITH CHECK (deleted_at IS NOT NULL);

-- ============================================================================
-- Triggers padrão
-- ============================================================================

-- Auto-update updated_at
CREATE TRIGGER trg___TABLE___updated_at
  BEFORE UPDATE ON public.__TABLE__
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set bu_id a partir do contexto da request, se omitido
-- (Requer função set_bu_id_from_context() existente)
CREATE TRIGGER trg___TABLE___set_bu_id
  BEFORE INSERT ON public.__TABLE__
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bu_id_from_context();
