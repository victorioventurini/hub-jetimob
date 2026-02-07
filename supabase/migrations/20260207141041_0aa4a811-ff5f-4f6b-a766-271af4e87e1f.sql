-- ============================================================================
-- Migration: Team Checkin Summary Email
-- Adds idempotency column and notification event/template for team check-in summary
-- ============================================================================

-- 1. Add idempotency column to okr_wizard_sessions
ALTER TABLE public.okr_wizard_sessions
ADD COLUMN IF NOT EXISTS summary_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.okr_wizard_sessions.summary_sent_at IS 
  'Timestamp of when the summary email was sent (ensures idempotency)';

-- 2. Create notification event for team check-in summary
INSERT INTO public.notification_events (
  slug, 
  module, 
  name, 
  description, 
  audience, 
  severity, 
  is_mandatory, 
  default_channels, 
  icon
) VALUES (
  'team.checkin.summary',
  'okrs',
  'Resumo do Check-in do Time',
  'E-mail consolidado após conclusão do check-in coletivo do time',
  'internal',
  'info',
  false,
  ARRAY['email']::text[],
  'ClipboardCheck'
) ON CONFLICT (slug) DO NOTHING;

-- 3. Create email template for team check-in summary
-- Using ON CONFLICT with the existing unique constraint (event_slug, channel, version)
INSERT INTO public.notification_templates (
  event_slug, 
  channel, 
  bu_id, 
  subject_template, 
  body_template, 
  version, 
  is_active
) VALUES (
  'team.checkin.summary',
  'email',
  NULL,
  '[{{bu_name}}] Check-in do time {{team_name}} — {{current_datetime}}',
  '## Check-in do Time {{team_name}}

**{{cycle_name}}** | {{current_datetime}}

---

{{opening_text}}

### Objetivos do Time
{{objectives_summary}}

### KRs e Métricas em Destaque
{{krs_highlight}}

### Indicadores Relevantes
{{kpis_summary}}

### Iniciativas e Decisões
{{initiatives_summary}}

### Riscos e Bloqueios
{{risks_summary}}

### Próximos Focos
{{next_focus}}

---

> {{culture_message}}

---

{{closing_text}}

[Acessar check-in completo no Hub]({{context_url}})',
  1,
  true
) ON CONFLICT (event_slug, channel, version) DO NOTHING;