INSERT INTO public.permission_template_items_v2 (template_id, permission_key)
SELECT '8623dcc6-8e83-4bfd-80e1-26d659570c55', 'okrs.initiative.update:self_or_owner'
WHERE NOT EXISTS (
  SELECT 1 FROM public.permission_template_items_v2
  WHERE template_id = '8623dcc6-8e83-4bfd-80e1-26d659570c55'
    AND permission_key = 'okrs.initiative.update:self_or_owner'
);