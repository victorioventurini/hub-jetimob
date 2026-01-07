-- Habilitar todos os grupos de permissão (is_system = true) em todas as BUs ativas
-- Isso é necessário porque a view user_effective_permissions exige bu_permission_group_configs.is_enabled = true

INSERT INTO bu_permission_group_configs (bu_id, group_id, is_enabled)
SELECT bu.id, pg.id, true
FROM bu_units bu
CROSS JOIN permission_groups pg
WHERE pg.is_system = true
  AND bu.status = 'active'
ON CONFLICT (bu_id, group_id) DO UPDATE SET is_enabled = true;