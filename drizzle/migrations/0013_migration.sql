INSERT INTO public.notification_channels (slug, name, description, icon, requires_configuration, display_order)
VALUES ('google_chat', 'Google Chat', 'Mensagem direta do bot Next Jetimob no Google Chat', 'message-square', true, 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.bu_notification_channels (bu_id, channel_slug, is_enabled, config)
SELECT b.id, 'google_chat', b.id = 'a0000000-0000-0000-0000-000000000001'::uuid, '{}'::jsonb
FROM public.bu_units b
WHERE NOT EXISTS (
  SELECT 1 FROM public.bu_notification_channels x WHERE x.bu_id = b.id AND x.channel_slug = 'google_chat'
);

UPDATE public.notification_events
SET default_channels = array_append(default_channels, 'google_chat')
WHERE slug IN ('ticket.assigned','ticket.created','ticket.mention.created','ticket.message.created','ticket.status.changed','ticket.sla.warning','ticket.sla.breached','mention.created','project.mention.created')
  AND NOT ('google_chat' = ANY(default_channels));