---
name: standards/notifications/email-url-absolutization
description: SSOT relativo no banco; providers absolutizam via SITE_URL; renderTemplate auto-absolutiza variáveis _url
type: feature
---

Triggers SQL gravam `notification_outbox.payload.context_url` como **path relativo** (ex.: `/go/ticket/<id>`, `/projects/<id>`) seguindo o padrão canônico de `src/lib/shareableLinks.ts`. **Nunca** gravar URL absoluta no banco — quebra portabilidade entre ambientes (Test/Live, custom domain) e duplica protocolo no render.

Absolutização é responsabilidade exclusiva dos providers em `supabase/functions/_shared/notification-providers/`:
- **Email** (`templates.ts`): `renderTemplate()` aplica `absolutizeUrl()` automaticamente em qualquer variável cujo nome seja `context_url` ou termine com `_url`. O wrapper `buildNotificationEmailHtmlFromTemplate` também absolutiza o CTA "Ver no Hub". Helper é idempotente: retorna inalterado se já absoluto, prefixa `SITE_URL` se relativo, retorna vazio para null/undefined.
- **Slack/Webhook**: já tratam URL no formato esperado por cada plataforma.
- **In-app**: frontend resolve via react-router (path relativo é o esperado).

Por que existe: clientes de email (Gmail, Outlook, Apple Mail) **não** resolvem paths relativos no inbox — links inline `<a href="/go/...">` ficam quebrados. Bug original: email de menção tinha "Ver no Hub" funcionando (CTA absoluto) mas "Ver detalhes" inline quebrado (path relativo no markdown).

Ver: `supabase/functions/_shared/notification-providers/templates.ts`, `docs/qa/QA_EMAIL_CONTEXT_URL.md`, TCR §8.4.
