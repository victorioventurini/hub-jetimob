ALTER TABLE public.cycles DISABLE TRIGGER trg_enforce_bu_scope_cycles;

UPDATE public.cycles SET
  review_date_first_month = '2026-02-03', review_date = '2026-03-03',
  planning_date = '2026-03-16', retro_date = '2026-04-07'
WHERE id = '15b092b9-86f1-4cfd-97e1-62d2026c42e0';

UPDATE public.cycles SET
  review_date_first_month = '2026-05-05', review_date = '2026-06-02',
  planning_date = '2026-06-16', retro_date = '2026-07-07'
WHERE id = '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3';

UPDATE public.cycles SET
  review_date_first_month = '2026-08-04', review_date = '2026-09-01',
  planning_date = '2026-09-16', retro_date = '2026-10-06'
WHERE id = '76906d3f-ced4-42e7-ba8f-7dc6230bfda2';

UPDATE public.cycles SET
  review_date_first_month = '2026-11-03', review_date = '2026-12-01',
  planning_date = '2026-12-07', retro_date = '2027-01-05'
WHERE id = 'd3a725b0-c2f1-4d2a-9e70-4a6a46771f90';

ALTER TABLE public.cycles ENABLE TRIGGER trg_enforce_bu_scope_cycles;