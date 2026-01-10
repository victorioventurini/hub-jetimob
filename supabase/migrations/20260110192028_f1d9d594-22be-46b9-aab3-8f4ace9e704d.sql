
-- Disable specific BU scope trigger to allow update
ALTER TABLE public.cycles DISABLE TRIGGER trg_enforce_bu_scope_cycles;

-- Fix Q1 2026 cycle start date
UPDATE public.cycles 
SET start_date = '2026-01-01'
WHERE id = '15b092b9-86f1-4cfd-97e1-62d2026c42e0';

-- Re-enable the trigger
ALTER TABLE public.cycles ENABLE TRIGGER trg_enforce_bu_scope_cycles;
