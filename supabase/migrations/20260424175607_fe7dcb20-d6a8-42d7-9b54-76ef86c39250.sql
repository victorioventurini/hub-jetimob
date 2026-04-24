-- Desabilitar enforcement de BU temporariamente para o backfill
-- (migration roda fora de contexto de usuário/BU).
ALTER TABLE public.project_milestones DISABLE TRIGGER USER;

-- 1) Backfill: qualquer milestone vivo sem owner herda owner do projeto.
UPDATE public.project_milestones pm
SET owner_id = p.owner_id, updated_at = now()
FROM public.projects p
WHERE pm.project_id = p.id
  AND pm.owner_id IS NULL
  AND p.owner_id IS NOT NULL;

-- 2) Defesa: cobrir milestones soft-deleted ou órfãos remanescentes.
UPDATE public.project_milestones
SET owner_id = (SELECT owner_id FROM public.projects WHERE id = project_milestones.project_id)
WHERE owner_id IS NULL;

-- Reabilitar triggers
ALTER TABLE public.project_milestones ENABLE TRIGGER USER;

-- 3) Constraint: owner_id obrigatório.
ALTER TABLE public.project_milestones
  ALTER COLUMN owner_id SET NOT NULL;
