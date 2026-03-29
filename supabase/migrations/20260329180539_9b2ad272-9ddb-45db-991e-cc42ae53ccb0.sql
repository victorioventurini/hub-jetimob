
ALTER TABLE public.projects DISABLE TRIGGER enforce_bu_scope_projects;

UPDATE public.projects
SET deleted_at = now(), updated_at = now()
WHERE id IN (
  '5db66807-f874-4f1b-a363-fb9076b2b521',
  'cc6cf7d8-f466-44ee-a906-3023197eb0f4',
  '06898095-c4fc-4107-8ad3-b3c6372392cb'
)
AND deleted_at IS NULL;

ALTER TABLE public.projects ENABLE TRIGGER enforce_bu_scope_projects;
