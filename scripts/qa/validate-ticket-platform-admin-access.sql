-- Read-only assertions. Run through the QA database query tool.
-- Platform authorization remains based on auth.uid(), not a caller-supplied profile.
SELECT public.is_platform_admin(p.user_id)
  AND public.has_permission(p.id, t.bu_id, 'tickets.settings.manage:bu') AS victorio_has_existing_admin_access
FROM public.profiles p
JOIN public.tickets t ON t.id = 'b49e0569-5b09-4d6f-9fc2-01db0a4bdcaf'
WHERE p.work_email = 'victorio@jetimob.com'
  AND t.bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f'
  AND t.deleted_at IS NULL;

-- Without an authenticated caller, passing Victorio's profile must not grant
-- platform privileges on this private ticket.
SELECT NOT public.can_view_ticket(
  'b49e0569-5b09-4d6f-9fc2-01db0a4bdcaf',
  'f375b494-5edf-463e-97c1-c39206692759'
) AS unauthenticated_profile_spoof_is_denied;