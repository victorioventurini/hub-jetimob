-- ============================================================
-- NOTIFICATION TEMPLATES v2 - Migration 1/3
-- Fix event_slug to match notification_events catalog
-- ============================================================

-- Correção de slugs incorretos
UPDATE public.notification_templates 
SET event_slug = 'asset.checkout', updated_at = now()
WHERE event_slug = 'assets.checkout';

UPDATE public.notification_templates 
SET event_slug = 'mention.created', updated_at = now()
WHERE event_slug = 'core.mention';

UPDATE public.notification_templates 
SET event_slug = 'kpi.target.reached', updated_at = now()
WHERE event_slug = 'kpis.target_reached';

UPDATE public.notification_templates 
SET event_slug = 'okr.checkin.created', updated_at = now()
WHERE event_slug = 'okrs.checkin.created';

UPDATE public.notification_templates 
SET event_slug = 'okr.checkin.overdue', updated_at = now()
WHERE event_slug = 'okrs.kr.overdue';

UPDATE public.notification_templates 
SET event_slug = 'team.member.added', updated_at = now()
WHERE event_slug = 'teams.member_added';

UPDATE public.notification_templates 
SET event_slug = 'ticket.assigned', updated_at = now()
WHERE event_slug = 'tickets.assigned';

UPDATE public.notification_templates 
SET event_slug = 'ticket.created', updated_at = now()
WHERE event_slug = 'tickets.created';

UPDATE public.notification_templates 
SET event_slug = 'ticket.status.changed', updated_at = now()
WHERE event_slug = 'tickets.status_changed';

-- Remover templates órfãos (sem evento correspondente)
DELETE FROM public.notification_templates 
WHERE event_slug = 'assets.checkin';

-- Log das correções
DO $$
BEGIN
  RAISE NOTICE 'Migration 1/3 completed: Fixed event_slug values in notification_templates';
END $$;