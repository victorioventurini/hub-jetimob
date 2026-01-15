-- Desabilitar temporariamente o trigger de enforce_bu_scope
ALTER TABLE public.teams DISABLE TRIGGER trg_enforce_bu_scope_teams;

-- Reativar o time "Produto & Tecnologia"
UPDATE public.teams 
SET deleted_at = NULL, updated_at = now() 
WHERE id = 'd7d7a88f-fa09-46b3-8d9a-be6925c52769';

-- Reabilitar o trigger
ALTER TABLE public.teams ENABLE TRIGGER trg_enforce_bu_scope_teams;