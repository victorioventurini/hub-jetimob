-- Corrigir views para usar SECURITY INVOKER
DROP VIEW IF EXISTS public.v_notification_delivery_health;
DROP VIEW IF EXISTS public.v_notification_failures;

-- View: Saúde de entregas por BU/canal/status (SECURITY INVOKER)
CREATE VIEW public.v_notification_delivery_health 
WITH (security_invoker = true)
AS
SELECT 
  bu.name AS bu_name,
  o.bu_id,
  o.channel_slug,
  o.status,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE o.created_at >= now() - interval '24 hours') AS last_24h,
  COUNT(*) FILTER (WHERE o.created_at >= now() - interval '1 hour') AS last_1h,
  AVG(o.retries)::numeric(5,2) AS avg_retries
FROM public.notification_outbox o
LEFT JOIN public.bu_units bu ON bu.id = o.bu_id
GROUP BY bu.name, o.bu_id, o.channel_slug, o.status;

-- View: Últimas falhas (SECURITY INVOKER)
CREATE VIEW public.v_notification_failures
WITH (security_invoker = true)
AS
SELECT 
  o.id,
  bu.name AS bu_name,
  o.bu_id,
  o.user_id,
  o.event_slug,
  o.channel_slug,
  o.status,
  o.retries,
  o.last_error,
  o.created_at,
  o.processed_at
FROM public.notification_outbox o
LEFT JOIN public.bu_units bu ON bu.id = o.bu_id
WHERE o.status = 'failed' OR o.retries > 0
ORDER BY o.created_at DESC
LIMIT 100;