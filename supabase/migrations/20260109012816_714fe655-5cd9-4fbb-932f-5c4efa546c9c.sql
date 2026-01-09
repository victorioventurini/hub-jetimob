-- Phase 3: Backfill slack and webhook event settings for all BUs
-- Respect mandatory events: is_enabled=true for mandatory, false otherwise

INSERT INTO public.bu_notification_event_settings (bu_id, event_slug, channel, is_enabled)
SELECT 
  bu.id as bu_id,
  ne.slug as event_slug,
  ch.slug as channel,
  ne.is_mandatory as is_enabled -- Mandatory events stay enabled, others disabled
FROM public.bu_units bu
CROSS JOIN public.notification_events ne
CROSS JOIN (
  SELECT slug FROM public.notification_channels 
  WHERE slug IN ('slack', 'webhook')
) ch
WHERE NOT EXISTS (
  SELECT 1 FROM public.bu_notification_event_settings bnes
  WHERE bnes.bu_id = bu.id 
    AND bnes.event_slug = ne.slug 
    AND bnes.channel = ch.slug
);

-- Ensure slack and webhook are in bu_notification_channels for all BUs (disabled by default)
INSERT INTO public.bu_notification_channels (bu_id, channel_slug, is_enabled, config)
SELECT 
  bu.id as bu_id,
  ch.slug as channel_slug,
  false as is_enabled, -- Channel disabled until configured
  jsonb_build_object('configured', false) as config
FROM public.bu_units bu
CROSS JOIN (
  SELECT slug FROM public.notification_channels 
  WHERE slug IN ('slack', 'webhook')
) ch
WHERE NOT EXISTS (
  SELECT 1 FROM public.bu_notification_channels bnc
  WHERE bnc.bu_id = bu.id 
    AND bnc.channel_slug = ch.slug
);