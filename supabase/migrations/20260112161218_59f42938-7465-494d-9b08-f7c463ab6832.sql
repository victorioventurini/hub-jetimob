-- ============================================================
-- RLS Policies para tabela tickets
-- Seguindo padrão existente: user_has_bu_access + is_current_bu
-- ============================================================

-- Policy de SELECT: usuários podem ver tickets da sua BU atual
CREATE POLICY "tickets_select_policy"
ON public.tickets
FOR SELECT
USING (
  user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
);

-- Policy de INSERT: usuários podem criar tickets na sua BU atual
CREATE POLICY "tickets_insert_policy"
ON public.tickets
FOR INSERT
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
);

-- Policy de UPDATE: usuários podem atualizar tickets da sua BU atual
CREATE POLICY "tickets_update_policy"
ON public.tickets
FOR UPDATE
USING (
  user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
)
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
);

-- Policy de DELETE: usuários podem deletar tickets da sua BU atual
CREATE POLICY "tickets_delete_policy"
ON public.tickets
FOR DELETE
USING (
  user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
);