
ALTER TABLE public.cycles DISABLE TRIGGER trg_enforce_bu_scope_cycles;

UPDATE public.cycles SET
  review_date = '2026-02-05',
  planning_date = '2026-03-05',
  retro_date = '2026-03-19'
WHERE id = '15b092b9-86f1-4cfd-97e1-62d2026c42e0';

UPDATE public.cycles SET
  review_date = '2026-05-06',
  planning_date = '2026-06-03',
  retro_date = '2026-06-17'
WHERE id = '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3';

UPDATE public.cycles SET
  review_date = '2026-08-05',
  planning_date = '2026-09-02',
  retro_date = '2026-09-16'
WHERE id = '76906d3f-ced4-42e7-ba8f-7dc6230bfda2';

UPDATE public.cycles SET
  review_date = '2026-11-05',
  planning_date = '2026-12-03',
  retro_date = '2026-12-17'
WHERE id = 'd3a725b0-c2f1-4d2a-9e70-4a6a46771f90';

ALTER TABLE public.cycles ENABLE TRIGGER trg_enforce_bu_scope_cycles;
