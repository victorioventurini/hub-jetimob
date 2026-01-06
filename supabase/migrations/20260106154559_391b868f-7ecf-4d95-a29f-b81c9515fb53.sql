-- Corrigir view para usar SECURITY INVOKER (padrão seguro)
DROP VIEW IF EXISTS public.user_effective_permissions;

CREATE VIEW public.user_effective_permissions 
WITH (security_invoker = true)
AS
SELECT DISTINCT
  upg.user_id,
  upg.bu_id,
  pc.id AS permission_id,
  pc.key AS permission_key,
  pc.module,
  pc.resource,
  pc.action,
  pc.scope::text,
  'group' AS source,
  pg.name AS source_name
FROM public.bu_user_permission_groups upg
JOIN public.bu_permission_group_configs pgc
  ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
JOIN public.permission_groups pg
  ON pg.id = upg.group_id AND pg.status = 'active'
JOIN public.permission_group_permissions pgp
  ON pgp.group_id = upg.group_id
JOIN public.permission_catalog pc
  ON pc.id = pgp.permission_id AND pc.status = 'active'
WHERE pgc.is_enabled = true

UNION

SELECT DISTINCT
  o.user_id,
  o.bu_id,
  pc.id AS permission_id,
  pc.key AS permission_key,
  pc.module,
  pc.resource,
  pc.action,
  pc.scope::text,
  'override' AS source,
  'Permissão Individual' AS source_name
FROM public.bu_user_permission_overrides o
JOIN public.permission_catalog pc
  ON pc.id = o.permission_id AND pc.status = 'active'
WHERE o.effect = 'allow';