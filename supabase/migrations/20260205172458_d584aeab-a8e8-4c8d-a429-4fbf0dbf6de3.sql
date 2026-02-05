-- Wave 8: Expand collaborator_base_v2 template with basic view permissions
-- Current: only 1 key (notifications.user.manage:self)
-- Target: comprehensive view access for all core modules

INSERT INTO permission_template_items_v2 (template_id, permission_key)
SELECT 
  '8623dcc6-8e83-4bfd-80e1-26d659570c55'::uuid,
  key
FROM permission_catalog
WHERE key IN (
  'home.view:bu',
  'okrs.view:bu',
  'kpis.view:bu',
  'assets.view:bu',
  'teams.view:bu',
  'users.list.view:bu',
  'users.profile.view:bu',
  'tickets.ticket.view:bu',
  'bu.settings.view:bu',
  'bu.location.view:bu'
)
ON CONFLICT (template_id, permission_key) DO NOTHING;