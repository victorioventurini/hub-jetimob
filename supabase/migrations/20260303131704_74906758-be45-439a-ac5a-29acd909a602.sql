INSERT INTO notification_events (slug, module, name, description, audience, severity, is_mandatory, default_channels, icon)
VALUES 
  ('clevel.checkin.summary', 'okrs', 'Resumo do Check-in C-Level', 'E-mail de resumo enviado após a conclusão do check-in estratégico C-Level', 'internal', 'info', false, ARRAY['email', 'in_app'], 'briefcase'),
  ('collaborator.checkin.summary', 'okrs', 'Resumo do Check-in do Colaborador', 'E-mail de resumo enviado após a conclusão do check-in individual do colaborador', 'internal', 'info', false, ARRAY['email', 'in_app'], 'user-check')
ON CONFLICT (slug) DO NOTHING;