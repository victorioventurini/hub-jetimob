-- Transição manual do ciclo trimestral da Jetimob (Q1 2026 → closed, Q2 2026 → active)
-- Necessário porque a transição automática não ocorreu e o ciclo Q1 já terminou em 31/03/2026
ALTER TABLE public.cycles DISABLE TRIGGER trg_enforce_bu_scope_cycles;

UPDATE public.cycles
   SET status = 'closed', updated_at = now()
 WHERE id = '15b092b9-86f1-4cfd-97e1-62d2026c42e0'
   AND bu_id = 'a0000000-0000-0000-0000-000000000001';

UPDATE public.cycles
   SET status = 'active', updated_at = now()
 WHERE id = '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3'
   AND bu_id = 'a0000000-0000-0000-0000-000000000001';

ALTER TABLE public.cycles ENABLE TRIGGER trg_enforce_bu_scope_cycles;