-- Fix: Corrigir a política de SELECT da tabela tickets para usar can_view_ticket
-- A política atual permite que qualquer usuário da BU veja todos os tickets

-- 1. Remover política de SELECT antiga que não respeita visibilidade
DROP POLICY IF EXISTS "tickets_select_policy" ON public.tickets;
DROP POLICY IF EXISTS "Users can view tickets they have access to" ON public.tickets;

-- 2. Criar nova política de SELECT que usa can_view_ticket
CREATE POLICY "tickets_select_policy" ON public.tickets
FOR SELECT
USING (
  deleted_at IS NULL 
  AND is_current_bu(bu_id)
  AND (
    -- Admins podem ver todos os tickets da BU
    is_bu_admin(auth.uid(), bu_id)
    OR is_platform_admin(auth.uid())
    -- Demais usuários passam pela função de visibilidade
    OR can_view_ticket(my_profile_id(), id)
  )
);