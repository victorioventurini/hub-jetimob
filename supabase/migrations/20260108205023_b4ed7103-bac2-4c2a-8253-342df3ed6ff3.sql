-- Temporarily disable the specific BU scope trigger
ALTER TABLE public.teams DISABLE TRIGGER trg_enforce_bu_scope_teams;

-- Reactivate team "Processos" by clearing deleted_at
UPDATE public.teams 
SET deleted_at = NULL, 
    updated_at = NOW()
WHERE id = '4e12fe21-a9b1-4bd4-b4cb-6591eaad282e';

-- Re-enable the trigger
ALTER TABLE public.teams ENABLE TRIGGER trg_enforce_bu_scope_teams;