
-- Temporarily disable bu_scope trigger for ticket_messages
ALTER TABLE public.ticket_messages DISABLE TRIGGER trg_enforce_bu_scope_ticket_messages;

-- Passo 1a: Fix body_richtext in ticket_messages
UPDATE public.ticket_messages
SET body_richtext = jsonb_set(
  body_richtext,
  '{content}',
  to_jsonb(replace(body_richtext->>'content',
    '@[mariana](internal:eef74ee3-c51b-4007-9338-5ae023eedfac)',
    '@[mariana](external:e33df2cf-d0c2-4ebb-9a77-6fec6a21b25d)'))
)
WHERE id = '77a9944d-d159-45c3-9eca-040d8e1bf67e';

UPDATE public.ticket_messages
SET body_richtext = jsonb_set(
  body_richtext,
  '{content}',
  to_jsonb(replace(body_richtext->>'content',
    '@[luana](internal:06efb1a2-6470-4fee-a05d-01179caf50e5)',
    '@[luana](external:97c0ca51-cb9a-4155-8cb0-b5ccef6abb3d)'))
)
WHERE id = 'c73e0800-44f2-4570-8aa1-36dbd2d904db';

-- Re-enable trigger
ALTER TABLE public.ticket_messages ENABLE TRIGGER trg_enforce_bu_scope_ticket_messages;

-- Passo 1b: Fix mentions table (no bu_scope trigger)
UPDATE public.mentions
SET mentioned_contact_id = 'e33df2cf-d0c2-4ebb-9a77-6fec6a21b25d',
    mentioned_user_id = NULL
WHERE id = '4ecd2c60-cfb5-43fc-aed4-5eaf31e88912';

UPDATE public.mentions
SET mentioned_contact_id = '97c0ca51-cb9a-4155-8cb0-b5ccef6abb3d',
    mentioned_user_id = NULL
WHERE id = 'e46f1864-fc41-40db-97cd-9d0e58a2e171';
