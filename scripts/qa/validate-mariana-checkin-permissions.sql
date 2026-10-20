-- Regression: Mariana must be able to submit her own KR check-ins in Jetimob.
-- Run with the read-query tool; each passed result must be true.
SELECT 'checkin_create' AS rule,
  public.has_permission('fc4fa31c-6e0d-4a3a-85a2-cb5facc848ca',
    'a0000000-0000-0000-0000-000000000001',
    'okrs.checkin.create:self_or_owner') AS passed
UNION ALL
SELECT 'own_kr_update',
  public.has_permission('fc4fa31c-6e0d-4a3a-85a2-cb5facc848ca',
    'a0000000-0000-0000-0000-000000000001',
    'okrs.team_kr.update:self_or_owner');