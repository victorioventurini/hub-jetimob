ALTER TABLE public.cycles DISABLE TRIGGER trg_enforce_bu_scope_cycles;

UPDATE public.cycles
SET retro_date = '2026-04-06'
WHERE id = '15b092b9-86f1-4cfd-97e1-62d2026c42e0';

ALTER TABLE public.cycles ENABLE TRIGGER trg_enforce_bu_scope_cycles;