-- Registrar o evento mbr.summary na tabela notification_events
INSERT INTO notification_events (slug, module, name, description, audience, severity, is_mandatory, default_channels, icon)
VALUES (
  'mbr.summary',
  'okrs',
  'Resumo do MBR',
  'Resumo executivo do Monthly Business Review com KPIs, decisões e próximos passos',
  'internal',
  'info',
  false,
  ARRAY['email', 'in_app'],
  'file-text'
)
ON CONFLICT DO NOTHING;